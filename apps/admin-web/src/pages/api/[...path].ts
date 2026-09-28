import { request } from "node:http";
import { request as secureRequest } from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const internalApiUrl = process.env.API_INTERNAL_URL;

  if (!internalApiUrl || !req.url?.startsWith("/api/")) {
    res.status(503).end();
    return;
  }

  const target = new URL(internalApiUrl);
  const requestPath = req.url.slice(4);
  const queryStart = requestPath.indexOf("?");
  target.pathname = queryStart === -1 ? requestPath : requestPath.slice(0, queryStart);
  target.search = queryStart === -1 ? "" : requestPath.slice(queryStart);

  const sendRequest = target.protocol === "https:" ? secureRequest : request;
  const upstream = sendRequest(
    target,
    {
      method: req.method,
      headers: buildUpstreamHeaders(req.headers, req.socket.remoteAddress)
    },
    (upstreamResponse) => {
      res.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(res);
    }
  );

  upstream.on("error", () => {
    if (res.headersSent) {
      res.destroy();
    } else {
      res.status(502).end();
    }
  });
  req.on("aborted", () => upstream.destroy());
  res.on("close", () => {
    if (!res.writableEnded) upstream.destroy();
  });
  req.pipe(upstream);
}

export function buildUpstreamHeaders(
  incoming: IncomingHttpHeaders,
  remoteAddress: string | undefined
): IncomingHttpHeaders {
  const headers = { ...incoming };

  delete headers.host;
  delete headers.connection;
  delete headers.cookie;
  delete headers.forwarded;
  delete headers["x-forwarded-for"];
  delete headers["x-forwarded-host"];
  delete headers["x-forwarded-port"];
  delete headers["x-forwarded-proto"];
  delete headers["x-real-ip"];

  if (remoteAddress) {
    headers["x-forwarded-for"] = remoteAddress;
  }

  return headers;
}
