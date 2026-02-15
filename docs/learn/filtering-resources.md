---
title: Filtering Resources
sidebar_position: 3
---

# Filtering Resources by Labels

Headlamp allows you to filter Kubernetes resources using labels, making it easy to find specific workloads across your clusters. This feature works just like `kubectl` label selectors, letting you narrow down lists of Pods, Deployments, Services, and other resources.

## Why Filter by Labels?

Labels are the standard way to organize and identify Kubernetes resources. By filtering with labels, you can:

- Quickly locate resources for a specific application or environment
- View only production workloads or resources in a specific tier
- Focus on resources that match specific criteria
- Share filtered views with teammates via URL

## How to Filter by Labels

In any resource list view (such as Pods, Deployments, or Services), you'll see a **Label Selector** input field in the header, next to the namespace filter.

<!-- TODO: Add screenshot of the Label Selector input field once available. -->

### Basic Filtering

Simply type your label selector and press **Enter** or click outside the field to apply the filter.

**Examples:**

```
app=nginx
```
Shows only resources with the label `app=nginx`.

```
env=production
```
Shows only resources with the label `env=production`.

### Multiple Labels

You can filter by multiple labels at once by separating them with commas:

```
app=nginx,env=production
```
Shows resources that have **both** `app=nginx` **and** `env=production`.

### Advanced Filtering

Headlamp supports the full Kubernetes label selector syntax:

#### Match any value from a set
```
env in (production,staging)
```
Shows resources where `env` is either `production` or `staging`.

#### Exclude values
```
tier!=backend
```
Shows resources where `tier` is **not** `backend`.

#### Check if label exists
```
app
```
Shows resources that have the `app` label (regardless of value).

#### Check if label doesn't exist
```
!deprecated
```
Shows resources that do **not** have the `deprecated` label.

#### Combine multiple conditions
```
app=nginx,env in (prod,staging),tier!=backend
```
Shows nginx resources in prod or staging that are not backend tier.

## Clearing Filters

To clear the label filter, click the **X** button that appears inside the input field when you have a filter active.

## Filter Persistence

Your label filters are automatically saved in two ways:

1. **In the URL** - The filter appears in the page URL, so you can bookmark or share filtered views
2. **In your browser** - The filter is remembered per cluster, so it persists when you return to the same cluster

## Combining with Namespace Filters

Label filters work alongside namespace filters. When both are active, Headlamp shows resources that match:
- The selected namespaces **AND**
- The label selector

This lets you narrow down to exactly what you need.

## Tips

- Press **Enter** after typing to apply the filter immediately
- The filter is applied automatically when you click outside the input field
- If a filter has invalid syntax, the Kubernetes API may return an error and no results will be shown
- Check the Kubernetes label selector documentation if a filter isn't working as expected
- Use the namespace filter first to reduce the number of resources, then apply label filters for precision

## Learn More

For more details on Kubernetes label selectors and their syntax, see the [Kubernetes documentation on labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/).
