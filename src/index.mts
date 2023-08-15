import { useApolloClient } from "@apollo/client/index.js";
import { getSuspenseCache } from "@apollo/client/react/cache/getSuspenseCache.js";
import { SuspenseCache } from "@apollo/client/react/cache/SuspenseCache.js";
import { Fragment, ReactNode, createElement, useRef } from "react";
import type { ApolloClient, ObservableQuery } from "@apollo/client";
import type { SuspenseCacheOptions } from "@apollo/client/react/cache";
import type { InternalQueryReference } from "@apollo/client/react/cache/QueryReference";
import type { CacheKey } from "@apollo/client/react/cache/types";

class SSRCache extends SuspenseCache {
  constructor(options: SuspenseCacheOptions = Object.create(null)) {
    super(options);
  }
  SuspenseCache() {}
  getQueryRef<TData = unknown>(
    cacheKey: CacheKey,
    createObservable: () => ObservableQuery<TData>,
  ) {
    const ref = super.getQueryRef(cacheKey, createObservable);
    this.refs.add(ref as InternalQueryReference<unknown>);
    return ref;
  }

  finished = false;
  refs = new Set<InternalQueryReference<unknown>>();
}

const DATA_NAME = "__NEXT_DATA_PROMISE__";
const suspenseCacheSymbol = Symbol.for("apollo.suspenseCache");

const DataRender = () => {
  const client = useApolloClient();
  const cache = getSuspenseCache(client);
  if (typeof window === "undefined") {
    if (!(cache instanceof SSRCache)) {
      throw new Error("SSRCache missing.");
    }
    if (!cache.finished) {
      throw Promise.allSettled(
        Array.from(cache.refs.values()).map(({ promise }) => promise),
      ).then((v) => {
        cache.finished = true;
        return v;
      });
    }
  }
  return createElement("script", {
    id: DATA_NAME,
    type: "application/json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(client.extract()).replace(/</g, "\\u003c"),
    },
  });
};

const useApolloCache = <T,>(
  client: ApolloClient<T> & {
    [suspenseCacheSymbol]?: SuspenseCache;
  },
) => {
  const property = useRef<{ initialized?: boolean }>({}).current;
  if (typeof window !== "undefined") {
    if (!property.initialized) {
      const node = document.getElementById(DATA_NAME);
      if (node) client.restore(JSON.parse(node.innerHTML));
      property.initialized = true;
    }
  } else {
    if (!client[suspenseCacheSymbol]) {
      client[suspenseCacheSymbol] = new SSRCache(
        client.defaultOptions.react?.suspense,
      );
    }
  }
};

export const ApolloSSRProvider = ({ children }: { children: ReactNode }) => {
  const client = useApolloClient();
  useApolloCache(client);
  return createElement(Fragment, {}, children, createElement(DataRender));
};
