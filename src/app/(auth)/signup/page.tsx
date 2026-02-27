"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";

import { signupSchema, type SignupValues } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      boat_name: "",
    },
  });

  async function onSubmit(values: SignupValues) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          boat_name: values.boat_name || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("Erreur de connexion au serveur.");
    }

    setIsLoading(false);
  }

  if (isSuccess) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <CheckCircle2 className="size-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Compte créé !</CardTitle>
          <CardDescription>
            Un administrateur doit approuver votre inscription. Vous recevrez un
            e-mail lorsque votre compte sera activé.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="outline">Retour à la connexion</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Créer un compte</CardTitle>
        <CardDescription>
          Rejoignez la communauté LCBconnect
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Jean Dupont"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse e-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="nom@exemple.fr"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="boat_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nom du bateau{" "}
                    <span className="text-muted-foreground font-normal">
                      (optionnel)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="La Cerise" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="animate-spin" />}
              Créer un compte
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
