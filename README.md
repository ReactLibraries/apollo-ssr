# @react-libraries/next-exchange-ssr

SSR on Next.js using @apollo/client's useSuspenseQuery.
To use it, simply add ApolloSSRProvider under ApolloProvider.

## Sample

- Source
  <https://github.com/SoraKumo001/next-apollo-ssr>
- App
  <https://next-apollo-ssr-six.vercel.app/>

### src/pages/\_app.tsx

```tsx
import type { AppType } from "next/app";
import { useState } from "react";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { ApolloSSRProvider } from "@react-libraries/apollo-ssr";

const uri = "https://graphql.anilist.co";

const App: AppType = ({ Component }) => {
  const [client] = useState(
    () =>
      new ApolloClient({
        uri,
        cache: new InMemoryCache({}),
      })
  );
  return (
    <ApolloProvider client={client}>
      {/* ←Add this */}
      <ApolloSSRProvider>
        <Component />
      </ApolloSSRProvider>
    </ApolloProvider>
  );
};

// getInitialProps itself is not needed, but it is needed to prevent optimization of _app.tsx
// If you don't include this, it will be executed at build time and will not be called after that.
App.getInitialProps = () => ({});

export default App;
```

### src/pages/index.tsx

```tsx
import { gql, useApolloClient, useSuspenseQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { Suspense } from "react";

// Retrieving the animation list
const QUERY = gql`
  query Query($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media {
        id
        title {
          english
          native
        }
      }
      pageInfo {
        currentPage
        hasNextPage
        lastPage
        perPage
        total
      }
    }
  }
`;

type PageData = {
  Page: {
    media: {
      id: number;
      siteUrl: string;
      title: { english: string; native: string };
    }[];
    pageInfo: {
      currentPage: number;
      hasNextPage: boolean;
      lastPage: number;
      perPage: number;
      total: number;
    };
  };
};

const AnimationList = ({ page }: { page: number }) => {
  const client = useApolloClient();
  const { data, refetch } = useSuspenseQuery<PageData>(QUERY, {
    variables: { page, perPage: 10 },
  });
  const { currentPage, lastPage } = data.Page.pageInfo;
  return (
    <>
      <button onClick={() => refetch()}>Refetch</button>
      <button onClick={() => client.resetStore()}>Reset</button>
      <div>
        <Link href={`/?page=${currentPage - 1}`}>
          <button disabled={currentPage <= 1}>←</button>
        </Link>
        <Link href={`/?page=${currentPage + 1}`}>
          <button disabled={currentPage >= lastPage}>→</button>
        </Link>
        {currentPage}/{lastPage}
      </div>
      {data.Page.media.map((v) => (
        <div
          key={v.id}
          style={{
            border: "solid 1px",
            padding: "8px",
            margin: "8px",
            borderRadius: "4px",
          }}
        >
          <div>
            {v.title.english} / {v.title.native}
          </div>
          <a href={v.siteUrl}>{v.siteUrl}</a>
        </div>
      ))}
    </>
  );
};

const Page = () => {
  const router = useRouter();
  const page = Number(router.query.page) || 1;

  return (
    <Suspense fallback={<div>Loading</div>}>
      <AnimationList page={page} />
    </Suspense>
  );
};

export default Page;
```
