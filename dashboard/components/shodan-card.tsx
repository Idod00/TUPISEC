"use client";

import { Server, Globe, AlertCircle, Wifi } from "lucide-react";
import type { ShodanData } from "@/lib/types";

interface Props {
  data: ShodanData;
}

export function ShodanCard({ data }: Props) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Server className="h-4 w-4 text-cyan-400" />
        <h3 className="font-semibold text-sm">Shodan Intelligence</h3>
        <a
          href={`https://www.shodan.io/host/${data.ip}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          shodan.io ↗
        </a>
      </div>

      {/* Host info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">IP</p>
            <p className="font-mono text-xs">{data.ip}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Organization</p>
          <p className="text-xs font-medium">{data.org || "Unknown"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Country</p>
          <p className="text-xs font-medium">{data.country || "Unknown"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Open Ports</p>
          <p className="text-xs font-medium">{data.open_ports.length}</p>
        </div>
      </div>

      {/* Open ports */}
      {data.open_ports.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1 mb-2">
            <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Open Ports & Services</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.services.map((svc, i) => (
              <span
                key={i}
                className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono"
                title={svc.product}
              >
                {svc.port}/{svc.transport}
                {svc.product ? ` (${svc.product})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CVEs from Shodan */}
      {data.vulns.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            <p className="text-xs text-muted-foreground">
              CVEs detected by Shodan ({data.vulns.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.vulns.map((cve, i) => (
              <a
                key={i}
                href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
              >
                {cve}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
