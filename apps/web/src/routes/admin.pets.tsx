import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/pets')({
  component: PetsPage,
});

function PetsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pets</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  );
}
