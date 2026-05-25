import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  // TanStackRouterDevtools đã bỏ — badge "TanStack Router" floating bottom-right
  // làm bẩn UI screenshot. Nếu cần debug route, thêm lại tạm thời rồi xóa.
  return <Outlet />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Trang không tồn tại.</p>
    </div>
  );
}
