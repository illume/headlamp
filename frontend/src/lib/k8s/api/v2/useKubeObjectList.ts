/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { headlampApi } from '../../../api/headlampApi';
import type { KubeObject, KubeObjectClass } from '../../KubeObject';
import type { QueryParameters } from '../v1/queryParameters';
import { ApiError } from './ApiError';
import { clusterFetch } from './fetch';
import type { QueryListResponse } from './hooks';
import { useEndpoints } from './hooks';
import type { KubeListUpdateEvent } from './KubeList';
import { KubeList } from './KubeList';
import { KubeObjectEndpoint } from './KubeObjectEndpoint';
import { makeUrl } from './makeUrl';
import { WebSocketManager } from './multiplexer';
import { BASE_WS_URL, useWebSockets } from './webSocket';

/**
 * @returns true if the websocket multiplexer is enabled.
 * defaults to true. This is a feature flag to enable the websocket multiplexer.
 */
export function getWebsocketMultiplexerEnabled(): boolean {
  return import.meta.env.REACT_APP_ENABLE_WEBSOCKET_MULTIPLEXER === 'true';
}

/**
 * Object representing a List of Kube object
 * with information about which cluster and namespace it came from
 */
export interface ListResponse<K extends KubeObject> {
  /** KubeList with items */
  list: KubeList<K>;
  /** Cluster of the list */
  cluster: string;
  /** If the list only has items from one namespace */
  namespace?: string;
}

/**
 * Cache key for a kube object list query.
 * Used to identify individual list queries in the combined endpoint.
 */
export function kubeObjectListQueryKey(
  kubeObjectClass: KubeObjectClass,
  endpoint: KubeObjectEndpoint,
  namespace: string | undefined,
  cluster: string,
  queryParams: QueryParameters
) {
  return [
    'kubeObject',
    'list',
    kubeObjectClass.apiVersion,
    kubeObjectClass.apiName,
    cluster,
    namespace ?? '',
    queryParams,
  ];
}

/**
 * @deprecated Use kubeObjectListQueryKey instead.
 * Kept for backward compatibility in tests.
 */
export function kubeObjectListQuery(
  kubeObjectClass: KubeObjectClass,
  endpoint: KubeObjectEndpoint,
  namespace: string | undefined,
  cluster: string,
  queryParams: QueryParameters
) {
  return {
    queryKey: kubeObjectListQueryKey(kubeObjectClass, endpoint, namespace, cluster, queryParams),
  };
}

/**
 * Fetch a single kube object list from one cluster/namespace.
 */
async function fetchKubeObjectList<K extends KubeObject>(
  kubeObjectClass: KubeObjectClass,
  endpoint: KubeObjectEndpoint,
  namespace: string | undefined,
  cluster: string,
  queryParams: QueryParameters
): Promise<ListResponse<K>> {
  try {
    const list: KubeList<any> = await clusterFetch(
      makeUrl([KubeObjectEndpoint.toUrl(endpoint!, namespace)], queryParams),
      {
        cluster,
      }
    ).then(it => it.json());
    list.items = list.items.map(item => {
      const itm = new kubeObjectClass({
        ...item,
        kind: list.kind.replace('List', ''),
        apiVersion: list.apiVersion,
      });
      itm.cluster = cluster;
      return itm;
    });

    return {
      list: list as KubeList<K>,
      cluster,
      namespace,
    };
  } catch (e) {
    if (e instanceof ApiError) {
      e.cluster = cluster;
      e.namespace = namespace;
    }
    throw e;
  }
}

/** Arguments for the combined kube object lists query */
interface KubeObjectListsQueryArgs {
  kubeObjectClass: KubeObjectClass;
  endpoint: KubeObjectEndpoint;
  queries: Array<{
    cluster: string;
    namespace?: string;
    queryParams: QueryParameters;
  }>;
}

/** Result from the combined kube object lists query, including partial errors */
interface KubeObjectListsResult<K extends KubeObject> {
  lists: Array<ListResponse<K> | null>;
  /** Errors from individual cluster/namespace fetches that failed */
  errors: ApiError[];
}

const kubeListApi = headlampApi.injectEndpoints({
  endpoints: build => ({
    getKubeObjectLists: build.query<KubeObjectListsResult<any>, KubeObjectListsQueryArgs>({
      queryFn: async ({ kubeObjectClass, endpoint, queries }) => {
        try {
          const results = await Promise.allSettled(
            queries.map(({ cluster, namespace, queryParams }) =>
              fetchKubeObjectList(kubeObjectClass, endpoint, namespace, cluster, queryParams)
            )
          );
          const lists = results.map(r => (r.status === 'fulfilled' ? r.value : null));
          const errors = results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map(r => r.reason as ApiError);
          if (errors.length > 0 && errors.length === results.length) {
            // All queries failed — return as error
            return { error: errors[0] };
          }
          return { data: { lists, errors } };
        } catch (error) {
          return { error };
        }
      },
      serializeQueryArgs: ({ queryArgs }) => {
        const { kubeObjectClass, ...rest } = queryArgs;
        void kubeObjectClass;
        return JSON.stringify(rest);
      },
    }),
  }),
});

export { kubeListApi };

/**
 * Build a lookup key from cluster and namespace for O(1) list index resolution.
 */
function listKey(cluster: string, namespace: string | undefined): string {
  return `${cluster}:${namespace || ''}`;
}

/**
 * Build a Map from `"cluster:namespace"` → index in the lists array.
 * Used by websocket handlers for O(1) cache index lookups instead of O(n) findIndex.
 */
function buildListIndexMap(
  lists: ReadonlyArray<{ cluster: string; namespace?: string }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < lists.length; i++) {
    map.set(listKey(lists[i].cluster, lists[i].namespace), i);
  }
  return map;
}

/**
 * Accepts a list of lists to watch.
 * Upon receiving update it will modify query data for list query
 */
export function useWatchKubeObjectLists<K extends KubeObject>({
  kubeObjectClass,
  endpoint,
  lists,
  queryParams,
  queryArgs,
}: {
  /** KubeObject class of the watched resource list */
  kubeObjectClass: (new (...args: any) => K) & typeof KubeObject<any>;
  /** Query parameters for the WebSocket connection URL */
  queryParams?: QueryParameters;
  /** Kube resource API endpoint information */
  endpoint?: KubeObjectEndpoint | null;
  /** Which clusters and namespaces to watch */
  lists: Array<{ cluster: string; namespace?: string; resourceVersion: string }>;
  /** RTK Query args for updating the cache */
  queryArgs?: KubeObjectListsQueryArgs;
}) {
  if (getWebsocketMultiplexerEnabled()) {
    return useWatchKubeObjectListsMultiplexed({
      kubeObjectClass,
      endpoint,
      lists,
      queryParams,
      queryArgs,
    });
  } else {
    return useWatchKubeObjectListsLegacy({
      kubeObjectClass,
      endpoint,
      lists,
      queryParams,
      queryArgs,
    });
  }
}

/**
 * Watches Kubernetes resource lists using multiplexed WebSocket connections.
 * Efficiently manages subscriptions and updates to prevent unnecessary re-renders
 * and WebSocket reconnections.
 *
 * @template K - Type extending KubeObject for the resources being watched
 * @param kubeObjectClass - Class constructor for the Kubernetes resource type
 * @param endpoint - API endpoint information for the resource
 * @param lists - Array of cluster, namespace, and resourceVersion combinations to watch
 * @param queryParams - Optional query parameters for the WebSocket URL
 */
function useWatchKubeObjectListsMultiplexed<K extends KubeObject>({
  kubeObjectClass,
  endpoint,
  lists,
  queryParams,
  queryArgs,
}: {
  kubeObjectClass: (new (...args: any) => K) & typeof KubeObject<any>;
  endpoint?: KubeObjectEndpoint | null;
  lists: Array<{ cluster: string; namespace?: string; resourceVersion: string }>;
  queryParams?: QueryParameters;
  queryArgs?: KubeObjectListsQueryArgs;
}): void {
  const dispatch = useDispatch<any>();

  // Track the latest resource versions to prevent duplicate updates
  const latestResourceVersions = useRef<Record<string, string>>({});

  // Stabilize queryParams to prevent unnecessary effect triggers
  // Only update when the stringified params change
  const stableQueryParams = useMemo(() => queryParams, [JSON.stringify(queryParams)]);

  // Create stable connection URLs for each list
  // Updates only when endpoint, lists, or stableQueryParams change
  const connections = useMemo(() => {
    if (!endpoint) {
      return [];
    }

    return lists.map(list => {
      const key = listKey(list.cluster, list.namespace);

      // Always use the latest resource version from the server
      latestResourceVersions.current[key] = list.resourceVersion;

      // Construct WebSocket URL with current parameters
      return {
        url: makeUrl([KubeObjectEndpoint.toUrl(endpoint, list.namespace)], {
          ...stableQueryParams,
          watch: 1,
          resourceVersion: latestResourceVersions.current[key],
        }),
        cluster: list.cluster,
        namespace: list.namespace,
      };
    });
  }, [endpoint, lists, stableQueryParams]);

  // Keep a ref to queryArgs so the handler always has the latest
  const queryArgsRef = useRef(queryArgs);
  queryArgsRef.current = queryArgs;

  // Precompute {cluster:namespace} → index map for O(1) cache lookups.
  // Built from queryArgs.queries (not lists) so indices match draft.lists ordering,
  // even when some fetches failed and lists only contains successful entries.
  const indexMapRef = useRef<Map<string, number>>(new Map());
  indexMapRef.current = useMemo(() => buildListIndexMap(queryArgs?.queries ?? []), [queryArgs]);

  // Create stable update handler to process WebSocket messages
  // Re-create only when dependencies change
  const handleUpdate = useCallback(
    (update: any, cluster: string, namespace: string | undefined) => {
      if (!update || typeof update !== 'object' || !endpoint) {
        return;
      }

      const key = listKey(cluster, namespace);

      // Update resource version from incoming message
      if (update.object?.metadata?.resourceVersion) {
        latestResourceVersions.current[key] = update.object.metadata.resourceVersion;
      }

      // Update RTK Query cache
      if (queryArgsRef.current) {
        const cachedIdx = indexMapRef.current.get(key);
        if (cachedIdx === undefined) return;

        dispatch(
          kubeListApi.util.updateQueryData(
            'getKubeObjectLists',
            queryArgsRef.current,
            (draft: KubeObjectListsResult<any>) => {
              if (cachedIdx < draft.lists.length && draft.lists[cachedIdx]) {
                const newList = KubeList.applyUpdate(
                  draft.lists[cachedIdx]!.list,
                  update,
                  kubeObjectClass,
                  cluster
                );
                if (newList !== draft.lists[cachedIdx]!.list) {
                  draft.lists[cachedIdx] = { ...draft.lists[cachedIdx]!, list: newList };
                }
              }
            }
          )
        );
      }
    },
    [dispatch, kubeObjectClass, endpoint, stableQueryParams]
  );

  // Set up WebSocket subscriptions
  useEffect(() => {
    if (!endpoint || connections.length === 0) {
      return;
    }

    const cleanups: (() => void)[] = [];

    // Create subscriptions for each connection
    connections.forEach(({ url, cluster, namespace }) => {
      const parsedUrl = new URL(url, BASE_WS_URL);

      // Subscribe to WebSocket updates
      WebSocketManager.subscribe(cluster, parsedUrl.pathname, parsedUrl.search.slice(1), update =>
        handleUpdate(update, cluster, namespace)
      ).then(
        cleanup => cleanups.push(cleanup),
        error => {
          // Track retry count in the URL's searchParams
          const retryCount = parseInt(parsedUrl.searchParams.get('retryCount') || '0');
          if (retryCount < 3) {
            // Only log and allow retry if under threshold
            console.error('WebSocket subscription failed:', error);
            parsedUrl.searchParams.set('retryCount', (retryCount + 1).toString());
          }
        }
      );
    });

    // Cleanup subscriptions when effect re-runs or unmounts
    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [connections, endpoint, handleUpdate]);
}

/**
 * Accepts a list of lists to watch.
 * Upon receiving update it will modify query data for list query
 * @param kubeObjectClass - KubeObject class of the watched resource list
 * @param endpoint - Kube resource API endpoint information
 * @param lists - Which clusters and namespaces to watch
 * @param queryParams - Query parameters for the WebSocket connection URL
 */
function useWatchKubeObjectListsLegacy<K extends KubeObject>({
  kubeObjectClass,
  endpoint,
  lists,
  queryParams,
  queryArgs,
}: {
  /** KubeObject class of the watched resource list */
  kubeObjectClass: (new (...args: any) => K) & typeof KubeObject<any>;
  /** Query parameters for the WebSocket connection URL */
  queryParams?: QueryParameters;
  /** Kube resource API endpoint information */
  endpoint?: KubeObjectEndpoint | null;
  /** Which clusters and namespaces to watch */
  lists: Array<{ cluster: string; namespace?: string; resourceVersion: string }>;
  /** RTK Query args for updating the cache */
  queryArgs?: KubeObjectListsQueryArgs;
}) {
  const dispatch = useDispatch<any>();

  // Keep a ref to queryArgs so callbacks always have the latest
  const queryArgsRef = useRef(queryArgs);
  queryArgsRef.current = queryArgs;

  // Precompute {cluster:namespace} → index map for O(1) cache lookups.
  // Built from queryArgs.queries (not lists) so indices match draft.lists ordering,
  // even when some fetches failed and lists only contains successful entries.
  const indexMap = useMemo(() => buildListIndexMap(queryArgs?.queries ?? []), [queryArgs]);

  const connections = useMemo(() => {
    if (!endpoint) return [];

    return lists.map(({ cluster, namespace, resourceVersion }) => {
      const url = makeUrl([KubeObjectEndpoint.toUrl(endpoint!, namespace)], {
        ...queryParams,
        watch: 1,
        resourceVersion,
      });

      return {
        cluster,
        url,
        onMessage(update: KubeListUpdateEvent<K>) {
          if (queryArgsRef.current) {
            const cachedIdx = indexMap.get(listKey(cluster, namespace));
            if (cachedIdx === undefined) return;

            dispatch(
              kubeListApi.util.updateQueryData(
                'getKubeObjectLists',
                queryArgsRef.current,
                (draft: KubeObjectListsResult<any>) => {
                  if (cachedIdx < draft.lists.length && draft.lists[cachedIdx]) {
                    const newList = KubeList.applyUpdate(
                      draft.lists[cachedIdx]!.list,
                      update,
                      kubeObjectClass,
                      cluster
                    );
                    if (newList !== draft.lists[cachedIdx]!.list) {
                      draft.lists[cachedIdx] = { ...draft.lists[cachedIdx]!, list: newList };
                    }
                  }
                }
              )
            );
          }
        },
      };
    });
  }, [lists, kubeObjectClass, endpoint, indexMap, queryParams]);

  useWebSockets<KubeListUpdateEvent<K>>({
    enabled: !!endpoint,
    connections,
  });
}

/**
 * Creates multiple requests to list Kube objects
 * Handles multiple clusters, namespaces and allowed namespaces
 *
 * @param clusters - list of clusters
 * @param getAllowedNamespaces -  function to get allowed namespaces for a cluster
 * @param isResourceNamespaced - if the resource is namespaced
 * @param requestedNamespaces - requested namespaces(optional)
 *
 * @returns list of requests for clusters and appropriate namespaces
 */
export function makeListRequests(
  clusters: string[],
  getAllowedNamespaces: (cluster: string | null) => string[],
  isResourceNamespaced: boolean,
  requestedNamespaces: string[] = []
): Array<{ cluster: string; namespaces?: string[] }> {
  return clusters.map(cluster => {
    const allowedNamespaces = getAllowedNamespaces(cluster);

    let namespaces = requestedNamespaces.length > 0 ? requestedNamespaces : allowedNamespaces;

    if (allowedNamespaces.length) {
      namespaces = namespaces.filter(ns => allowedNamespaces.includes(ns));
    }

    return { cluster, namespaces: isResourceNamespaced ? namespaces : undefined };
  });
}

/**
 * Returns a combined list of Kubernetes objects and watches for changes from the clusters given.
 *
 * @param param - request paramaters
 * @returns Combined list of Kubernetes resources
 */
export function useKubeObjectList<K extends KubeObject>({
  requests,
  kubeObjectClass,
  queryParams,
  watch = true,
  refetchInterval,
}: {
  requests: Array<{ cluster: string; namespaces?: string[] }>;
  /** Class to instantiate the object with */
  kubeObjectClass: (new (...args: any) => K) & typeof KubeObject<any>;
  queryParams?: QueryParameters;
  /** Watch for updates @default true */
  watch?: boolean;
  /** How often to refetch the list. Won't refetch by default. Disables watching if set. */
  refetchInterval?: number;
}): [Array<K> | null, ApiError | null] &
  QueryListResponse<Array<ListResponse<K> | undefined | null>, K, ApiError> {
  const maybeNamespace = requests.find(it => it.namespaces)?.namespaces?.[0];

  // Get working endpoint from the first cluster
  // Now if clusters have different apiVersions for the same resource for example, this will not work
  const { endpoint, error: endpointError } = useEndpoints(
    kubeObjectClass.apiEndpoint.apiInfo,
    requests[0]?.cluster,
    maybeNamespace
  );

  const cleanedUpQueryParams = Object.fromEntries(
    Object.entries(queryParams ?? {}).filter(([, value]) => value !== undefined && value !== '')
  );

  // Build the list of individual queries for the combined endpoint
  const queryConfigs = useMemo(
    () =>
      endpoint
        ? requests.flatMap(({ cluster, namespaces }) =>
            namespaces && namespaces.length > 0
              ? namespaces.map(namespace => ({
                  cluster,
                  namespace,
                  queryParams: cleanedUpQueryParams,
                }))
              : [
                  {
                    cluster,
                    namespace: undefined as string | undefined,
                    queryParams: cleanedUpQueryParams,
                  },
                ]
          )
        : [],
    [requests, endpoint, cleanedUpQueryParams]
  );

  const queryArgs: KubeObjectListsQueryArgs = useMemo(
    () => ({
      kubeObjectClass,
      endpoint: endpoint!,
      queries: queryConfigs,
    }),
    [kubeObjectClass, endpoint, queryConfigs]
  );

  const queryResult = kubeListApi.useGetKubeObjectListsQuery(queryArgs, {
    skip: !endpoint || queryConfigs.length === 0,
    pollingInterval: refetchInterval,
    refetchOnMountOrArgChange: true,
  });

  const results = queryResult.data?.lists ?? [];
  const partialErrors = queryResult.data?.errors ?? [];

  // Combine results similar to how useQueries' combine worked
  const combined = useMemo(() => {
    const clusterResults = results.reduce((acc, result) => {
      if (result && result.cluster) {
        acc[result.cluster] = {
          data: result,
          error: null,
          errors: null,
          isError: false,
          isFetching: false,
          isLoading: false,
          isSuccess: true,
          items: result?.list?.items ?? null,
          status: 'success' as const,
        };
      }
      return acc;
    }, {} as Record<string, QueryListResponse<any, K, ApiError>>);

    const items: K[] | null = results.every(r => r === null)
      ? null
      : results.flatMap(r => (r?.list?.items as K[]) ?? []);

    return { clusterResults, items };
  }, [results]);

  const shouldWatch = watch && !refetchInterval && !queryResult.isLoading;

  const [listsToWatch, setListsToWatch] = useState<
    { cluster: string; namespace?: string; resourceVersion: string }[]
  >([]);

  const listsNotYetWatched = results
    .filter(Boolean)
    .filter(
      data =>
        listsToWatch.find(
          // resourceVersion is intentionally omitted to avoid recreating WS connection when list is updated
          watching => watching.cluster === data?.cluster && watching.namespace === data.namespace
        ) === undefined
    )
    .map(data => ({
      cluster: data!.cluster,
      namespace: data!.namespace,
      resourceVersion: data!.list.metadata.resourceVersion,
    }));

  if (listsNotYetWatched.length > 0) {
    setListsToWatch([...listsToWatch, ...listsNotYetWatched]);
  }

  const listsToStopWatching = listsToWatch.filter(
    watching =>
      requests.find(request =>
        watching.cluster === request?.cluster && request.namespaces && watching.namespace
          ? request.namespaces?.includes(watching.namespace)
          : true
      ) === undefined
  );

  if (listsToStopWatching.length > 0) {
    setListsToWatch(listsToWatch.filter(it => !listsToStopWatching.includes(it)));
  }

  useWatchKubeObjectLists({
    lists: shouldWatch ? listsToWatch : [],
    endpoint,
    kubeObjectClass,
    queryParams: cleanedUpQueryParams,
    queryArgs,
  });

  const queryError = queryResult.error as ApiError | undefined;
  const allErrors = [
    ...(endpointError ? [endpointError] : []),
    ...partialErrors,
    ...(queryError ? [queryError] : []),
  ];

  // @ts-ignore - TS compiler gets confused with iterators
  return {
    items: endpointError ? [] : combined.items,
    errors: allErrors.length > 0 ? allErrors : null,
    error: allErrors[0] ?? null,
    clusterResults: combined.clusterResults,
    isError: queryResult.isError || !!endpointError,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    isSuccess: queryResult.isSuccess && !endpointError,
    *[Symbol.iterator](): ArrayIterator<ApiError | K[] | null> {
      yield combined.items;
      yield allErrors[0] ?? null;
    },
  };
}
