import aguid from 'aguid';
import { Entry } from 'contensis-importer';
import mapJson from 'jsonpath-mapper';

export const mapWpPostToEntry = (post: any) => {
  const entry = {
    entryTitle: post.title.rendered,
    title: post.title.rendered,
    kicker: post.excerpt.rendered,
    publishDate: post.date,
    hero: post.media
      ? {
          asset: {
            sys: {
              id: aguid(`image-${post.media.id}`),
              dataFormat: 'asset',
            },
          },
          altText: post.media.media_details.image_meta.caption,
        }
      : null,
    content: post.content.rendered,
    sys: {
      isPublished: true,
      contentTypeId: 'post',
      dataFormat: 'entry',
      id: aguid(`post-${post.id}`),
      projectId: 'wordpress',
      slug: post.slug,
    },
  };

  return entry as Entry;
};

const getFilename = ({ source_url }: any) =>
  source_url.split('/')[source_url.split('/').length - 1];

export const mapWpMediaToEntry = (media: any) =>
  mapJson(media, {
    altText: 'alt_text',
    caption: 'media_details.image_meta.caption',
    entryTitle: {
      $path: ['media_details.image_meta.title', 'media_details.original_image'],
      $return: (title, root) => title || getFilename(root),
    },
    sys: {
      isPublished: true,
      contentTypeId: () => 'image',
      dataFormat: () => 'asset',
      id: ({ id }) => aguid(`image-${id}`),
      projectId: () => 'wordpress',
      properties: {
        fileId: ({ id }) => aguid(`image-${id}`),
        filePath: () => '/image-library/wp-uploads/',
        filename: getFilename,
      },
      uri: 'source_url',
    },
  }) as Entry;
