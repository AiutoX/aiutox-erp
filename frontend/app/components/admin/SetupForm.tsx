/**
 * Setup form component for creating initial superuser
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { useCreateSuperUser } from "~/hooks/useSetupStatus";

/**
 * Form validation schema
 */
const setupFormSchema = z
  .object({
    email: z.string().email("setup.form.email.invalid"),
    full_name: z.string().min(1, "setup.form.fullName.required"),
    password: z
      .string()
      .min(8, "setup.form.password.minLength")
      .regex(/[A-Z]/, "setup.form.password.uppercase")
      .regex(/[a-z]/, "setup.form.password.lowercase")
      .regex(/[0-9]/, "setup.form.password.digit"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "setup.form.confirmPassword.mismatch",
    path: ["confirmPassword"],
  });

type SetupFormValues = z.infer<typeof setupFormSchema>;

interface SetupFormProps {
  onSuccess?: () => void;
}

export function SetupForm({ onSuccess }: SetupFormProps) {
  const { t } = useTranslation();
  const createSuperUser = useCreateSuperUser();

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SetupFormValues) => {
    try {
      await createSuperUser.mutateAsync({
        email: data.email,
        full_name: data.full_name,
        password: data.password,
      });
      onSuccess?.();
    } catch (error) {
      // Error is handled by mutation error state
      console.error("Setup error:", error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">{t("setup.form.title")}</CardTitle>
        <CardDescription>{t("setup.form.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {createSuperUser.isSuccess && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>{t("setup.form.success.title")}</AlertTitle>
            <AlertDescription>
              {createSuperUser.data?.message || t("setup.form.success.message")}
            </AlertDescription>
          </Alert>
        )}

        {createSuperUser.isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("setup.form.error.title")}</AlertTitle>
            <AlertDescription>
              {createSuperUser.error?.message || t("setup.form.error.message")}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("setup.form.email.label")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("setup.form.email.placeholder")}
                      {...field}
                      disabled={createSuperUser.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("setup.form.email.description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("setup.form.fullName.label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("setup.form.fullName.placeholder")}
                      {...field}
                      disabled={createSuperUser.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("setup.form.fullName.description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("setup.form.password.label")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("setup.form.password.placeholder")}
                      {...field}
                      disabled={createSuperUser.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("setup.form.password.description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("setup.form.confirmPassword.label")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("setup.form.confirmPassword.placeholder")}
                      {...field}
                      disabled={createSuperUser.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createSuperUser.isPending || createSuperUser.isSuccess}
            >
              {createSuperUser.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("setup.form.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
