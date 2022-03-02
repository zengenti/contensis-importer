import wpapi from 'wpapi';
import to from 'await-to-js';

class WordPressJsonAdapter {
  wp: typeof wpapi;

  errors: Error[] = [];
  posts: any[] = [];

  constructor(siteUri: string) {
    this.wp = new wpapi({
      endpoint: `${siteUri}/wp-json`,
    });
  }

  get = async () => {
    const { api, errors } = this;
    const [perror, posts] = await api.posts();
    if (perror) errors.push(perror);

    for (const post of posts) {
      // Get any media associated with the post
      if (post.featured_media) {
        const [merror, mjson] = await api.media(post.featured_media);
        if (merror) errors.push(merror);
        else {
          post.media = mjson;
        }
      }
      this.posts.push(post);
    }
    return this;
  };
  api = {
    posts: () => to(this.wp.posts()) as Promise<[Error, any[]]>,

    media: (id?: string) => {
      if (id) return to(this.wp.media().id(id)) as Promise<[Error, any]>;
      return to(this.wp.media()) as Promise<[Error, any[]]>;
    },
  };
}

export default WordPressJsonAdapter;
