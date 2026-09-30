import { App } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";
import serveAudio from "#app/routes/audio";
import serveCover from "#app/routes/covers";
import serveFeed from "#app/routes/feed";
import show from "#app/pages/show";
import episode from "#app/pages/episode";
import signin from "#app/pages/signin";
import signup from "#app/pages/signup";
import dashboard from "#app/pages/dashboard";
import showEdit from "#app/pages/show-edit";
import episodeEdit from "#app/pages/episode-edit";

const app = new App();

app.route("/", home);
app.route("/signin", signin);
app.route("/signup", signup);
app.route("/dashboard", dashboard);
app.route("/dashboard/shows/new", showEdit);
app.route("/dashboard/shows/:id", showEdit);
app.route("/dashboard/shows/:showId/episodes/new", episodeEdit);
app.route("/dashboard/episodes/:id", episodeEdit);
app.route("/shows/:slug/feed.xml", serveFeed);
app.route("/shows/:slug", show);
app.route("/shows/:slug/:number(\\d+)", episode);
app.route("/audio/:id/:file", serveAudio);
app.route("/covers/:id/:file", serveCover);

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
