import type { Route } from "./+types/home";
import CartPoleSimulator from "~/components/CartPole/CartPole";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
  <div className="flex justify-center">
    <CartPoleSimulator />
  </div>);
}
