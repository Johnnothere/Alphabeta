import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

/**
 * Served from a route rather than `public/` so the Sitemap line can carry an
 * absolute URL — the robots.txt spec and Google both require one, and a static
 * file cannot know which origin it is being served from.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          ["User-agent: *", "Allow: /", "", `Sitemap: ${SITE_URL}/sitemap.xml`, ""].join("\n"),
          {
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "cache-control": "public, max-age=3600",
            },
          },
        ),
    },
  },
});
