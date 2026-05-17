/* @refresh reload */
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import Layout from "~/components/Layout/Layout";
import "./index.css";

const RootRedirect = lazy(() => import("~/pages/RootRedirect"));
const Garden = lazy(() => import("~/pages/Garden/Garden"));
const GardenList = lazy(() => import("~/pages/GardenList/GardenList"));
const CreateGarden = lazy(() => import("~/pages/CreateGarden/CreateGarden"));
const GardenSettings = lazy(
  () => import("~/pages/GardenSettings/GardenSettings"),
);
const GardenSetup = lazy(() => import("~/pages/GardenSetup/GardenSetup"));
const Camera = lazy(() => import("~/pages/Camera/Camera"));
const Settings = lazy(() => import("~/pages/Settings/Settings"));
const NotFound = lazy(() => import("~/pages/NotFound/NotFound"));

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={RootRedirect} />
      <Route path="/garden" component={GardenList} />
      <Route path="/garden/new" component={CreateGarden} />
      <Route path="/garden/:id" component={Garden} />
      <Route path="/garden/:id/setup" component={GardenSetup} />
      <Route path="/garden/:id/settings" component={GardenSettings} />
      <Route path="/camera" component={Camera} />
      <Route path="/settings" component={Settings} />
      <Route path="*404" component={NotFound} />
    </Router>
  ),
  root,
);
