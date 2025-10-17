import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Building {
  id: string;
  name: string;
  address: string | null;
  openTickets: number;
  inProgressTickets: number;
  overdueInvoices: number;
  medianResponseTime: string;
}

export default function PortfolioTab({ orgId }: { orgId: string }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuildings();
  }, [orgId]);

  const loadBuildings = async () => {
    setLoading(true);

    const { data: buildingsData } = await supabase
      .from('buildings_new')
      .select('*')
      .eq('org_id', orgId);

    if (!buildingsData) {
      setLoading(false);
      return;
    }

    const buildingsWithMetrics: Building[] = buildingsData.map((building: any) => ({
      id: building.id,
      name: building.name,
      address: building.address,
      openTickets: 0,
      inProgressTickets: 0,
      overdueInvoices: 0,
      medianResponseTime: 'N/A',
    }));

    setBuildings(buildingsWithMetrics);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading portfolio...</p>
        </CardContent>
      </Card>
    );
  }

  if (buildings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio overview</CardTitle>
          <CardDescription>Performance metrics across all buildings</CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No buildings yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio overview</CardTitle>
        <CardDescription>Performance metrics across all buildings</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Building</TableHead>
              <TableHead>Open Tickets</TableHead>
              <TableHead>In Progress</TableHead>
              <TableHead>Median Response Time</TableHead>
              <TableHead>Overdue Invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buildings.map((building) => (
              <TableRow key={building.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{building.name}</p>
                    {building.address && (
                      <p className="text-sm text-muted-foreground">{building.address}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {building.openTickets}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {building.inProgressTickets}
                  </Badge>
                </TableCell>
                <TableCell>{building.medianResponseTime}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {building.overdueInvoices}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
