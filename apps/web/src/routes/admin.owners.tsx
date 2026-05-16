import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/owners')({
  component: OwnersPage,
});

function OwnersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Owners</h1>
      <p className="text-muted-foreground">
        DataTable + filter bar + CRUD modal — module template (sẽ build sau khi codegen
        có spec).
      </p>
    </div>
  );
}
