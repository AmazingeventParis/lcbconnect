import { Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "./logout-button";

export default function PendingApprovalPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <Clock className="size-12 text-amber-500" />
        </div>
        <CardTitle className="text-2xl">En attente d&apos;approbation</CardTitle>
        <CardDescription>
          Votre inscription est en cours de validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-muted-foreground">
          Votre inscription est en cours de validation par un administrateur.
          Vous recevrez un e-mail lorsque votre compte sera activé.
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <LogoutButton />
      </CardFooter>
    </Card>
  );
}
