import { buildChunks, hotspotIdsFromChunks } from './retrieval';

export interface LessonContent {
  description: string;
  hotspots: string[];
  id: string;
  title: string;
}

function frontmatterField(frontmatter: string, name: string): string {
  const value = new RegExp(`^${name}:[ \\t]*(.*)$`, 'm').exec(frontmatter)?.[1]?.trim() ?? '';
  const quoted = value.match(/^(["'])(.*)\1$/)?.[2];
  return (quoted ?? value).trim();
}

/** Extracts the database fields shared by seeding and embedding ingestion. */
export function parseLessonContent(mdx: string, lessonId: string): LessonContent {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(mdx)?.[1] ?? '';
  const title = frontmatterField(frontmatter, 'title');
  const description = frontmatterField(frontmatter, 'description');
  const hotspots = hotspotIdsFromChunks(buildChunks(mdx, lessonId));
  if (!title || !description || hotspots.length === 0) {
    throw new Error(`Lesson ${lessonId} is missing title, description, or hotspot prose`);
  }
  return { description, hotspots, id: lessonId, title };
}
