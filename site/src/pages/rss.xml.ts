import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const releases = await getCollection('releases');
  const sortedReleases = releases.sort((a, b) =>
    new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  const siteUrl = context.site?.toString() || 'https://mazyu36.github.io';
  const basePath = import.meta.env.BASE_URL || '/aws-oss-update/';
  const fullSiteUrl = siteUrl + (basePath === '/' ? '' : basePath.replace(/\/$/, ''));

  return rss({
    title: 'AWS OSS リリース解説',
    description: 'AWS 関連 OSS のリリース内容を AI がわかりやすく解説します',
    site: fullSiteUrl,
    items: sortedReleases.map((release) => ({
      title: release.data.title,
      description: release.data.summary,
      pubDate: new Date(release.data.date),
      link: `/releases/${release.slug}/`,
    })),
    customData: `<language>ja</language>`,
  });
}
