import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/vets')({
  component: VetsPage,
});

function VetsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Vets</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  );
}
