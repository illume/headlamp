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

import { skipToken } from '@reduxjs/toolkit/query/react';
import React, { useEffect } from 'react';
import { getCluster } from '../../../lib/cluster';
import { KubeObject } from '../../../lib/k8s/KubeObject';
import { KubeObjectClass } from '../../../lib/k8s/KubeObject';
import { queryApi } from '../../../redux/queryApi';

/** List of valid request verbs. See https://kubernetes.io/docs/reference/access-authn-authz/authorization/#determine-the-request-verb. */
const VALID_AUTH_VERBS = [
  'create',
  'get',
  'list',
  'watch',
  'update',
  'patch',
  'delete',
  'deletecollection',
];

export interface AuthVisibleProps extends React.PropsWithChildren<{}> {
  /** The item for which auth will be checked or a resource class (e.g. Job). */
  item: KubeObject | KubeObjectClass | null;
  /** The verb associated with the permissions being verifying. See https://kubernetes.io/docs/reference/access-authn-authz/authorization/#determine-the-request-verb . */
  authVerb: string;
  /** The subresource for which the permissions are being verifyied (e.g. "log" when checking for a pod's log). */
  subresource?: string;
  /** The namespace for which we're checking the permission, if applied. This is mostly useful when checking "creation" using a resource class, instead of an instance. */
  namespace?: string;
  /** Callback for when an error occurs.
   * @param err The error that occurred.
   */
  onError?: (err: Error) => void;
  /** Callback for when the authorization is checked.
   * @param result The result of the authorization check. Its `allowed` member will be true if the user is authorized to perform the specified action on the given resource; false otherwise. The `reason` member will contain a string explaining why the user is authorized or not.
   */
  onAuthResult?: (result: { allowed: boolean; reason: string }) => void;
}

/** A component that will only render its children if the user is authorized to perform the specified action on the given resource.
 * @param props The props for the component.
 */
const authVisibleApi = queryApi.injectEndpoints({
  endpoints: build => ({
    checkAuthVisible: build.query<
      any,
      {
        itemName?: string;
        apiName: string;
        apiVersion: string | string[];
        authVerb: string;
        subresource?: string;
        namespace?: string;
        cluster?: string;
        item: any;
      }
    >({
      queryFn: async ({ item, authVerb, subresource, namespace, cluster }) => {
        try {
          const res = await item.getAuthorization(authVerb, { subresource, namespace }, cluster);
          return { data: res };
        } catch (e: any) {
          return { error: e };
        }
      },
      serializeQueryArgs: ({ queryArgs }) => {
        const { item, ...rest } = queryArgs;
        void item;
        return JSON.stringify(rest);
      },
    }),
  }),
});

export default function AuthVisible(props: AuthVisibleProps) {
  const { item, authVerb, subresource, namespace, onError, onAuthResult, children } = props;

  if (!VALID_AUTH_VERBS.includes(authVerb)) {
    console.warn(`Invalid authVerb provided: "${authVerb}". Skipping authorization check.`);
    return null;
  }

  const itemClass: KubeObjectClass | null = (item as KubeObject)?._class?.() ?? item;
  const itemName = (item as KubeObject)?.getName?.();

  const { data, error: queryError } = authVisibleApi.useCheckAuthVisibleQuery(
    item && itemClass
      ? {
          itemName,
          apiName: itemClass.apiName,
          apiVersion: itemClass.apiVersion,
          authVerb,
          subresource,
          namespace,
          cluster: (item as KubeObject)?.cluster ?? getCluster() ?? undefined,
          item,
        }
      : skipToken
  );

  const visible = data?.status?.allowed ?? false;

  useEffect(() => {
    if (queryError && onError) {
      onError(queryError as Error);
    }
  }, [queryError, onError]);

  useEffect(() => {
    if (data) {
      onAuthResult?.({
        allowed: visible,
        reason: data.status?.reason ?? '',
      });
    }
  }, [data]);

  if (!visible) {
    return null;
  }

  return <>{children}</>;
}
