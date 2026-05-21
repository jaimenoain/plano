import { redirect } from "react-router";

export async function loader() {
  return redirect("/embassy/contribute");
}

export default function AmbassadorPortal() {
  return null;
}
