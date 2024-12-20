import type { Route } from "./+types/home";
import DroneSimulator from "~/components/DorneSim/DorneSim";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
  <div className="flex justify-center h-screen">
    <DroneSimulator />
  </div>);
}