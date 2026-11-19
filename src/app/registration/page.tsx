import { redirect } from "next/navigation";

export default function RegistrationPage() {
  // Course registration is unified in /courses
  redirect("/courses");
}
