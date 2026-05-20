import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listWorkflowDeployments } from '@/features/workflows/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function DeploymentList() {
  const { data: deployments = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['workflow-deployments'],
    queryFn: listWorkflowDeployments,
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading deployments…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {deployments.length === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground">
          <p className="text-sm font-medium">No deployments yet</p>
          <p className="text-xs">Deploy a BPMN process from the Designer tab to see history here.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Deployment ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[190px]">Deployed At</TableHead>
                <TableHead className="w-[130px]">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((dep) => (
                <TableRow key={dep.id}>
                  <TableCell className="font-mono text-xs">{dep.id}</TableCell>
                  <TableCell>
                    {dep.name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {dep.deployedAt ? formatDate(dep.deployedAt) : '—'}
                  </TableCell>
                  <TableCell>
                    {dep.source ? (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {dep.source}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
