"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Globe, FileText } from "lucide-react";
import type { DnsRecord } from "@/lib/types";

interface DnsWhoisCardProps {
  dnsRecords?: DnsRecord[];
  whoisInfo?: Record<string, string>;
}

export function DnsWhoisCard({ dnsRecords, whoisInfo }: DnsWhoisCardProps) {
  const hasDns = dnsRecords && dnsRecords.length > 0;
  const hasWhois = whoisInfo && Object.keys(whoisInfo).length > 0;

  if (!hasDns && !hasWhois) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          DNS & WHOIS Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={hasDns ? "dns" : "whois"}>
          <TabsList className="mb-3">
            {hasDns && <TabsTrigger value="dns">DNS Records</TabsTrigger>}
            {hasWhois && <TabsTrigger value="whois">WHOIS Info</TabsTrigger>}
          </TabsList>

          {hasDns && (
            <TabsContent value="dns">
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[80px]">Type</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dnsRecords!.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs font-bold text-primary">{r.type}</TableCell>
                        <TableCell className="font-mono text-xs">{r.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {hasWhois && (
            <TabsContent value="whois">
              <div className="space-y-1">
                {Object.entries(whoisInfo!).map(([key, value]) => (
                  <div key={key} className="flex gap-3 py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-xs text-muted-foreground w-[140px] shrink-0 capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-mono break-all">{value}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
