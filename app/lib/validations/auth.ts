import { z } from "zod";

const passwordSchema = z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .max(128, "A senha deve ter no máximo 128 caracteres")
    .regex(/[a-z]/, "A senha deve conter ao menos uma letra minúscula")
    .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiúscula")
    .regex(/\d/, "A senha deve conter ao menos um número");

const emailSchema = z
    .string()
    .trim()
    .max(254, "E-mail muito longo")
    .pipe(z.email({ message: "Digite um e-mail válido" }));

export const signInSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Informe sua senha").max(128, "Senha inválida"),
    rememberMe: z.boolean(),
});

export const signUpSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Nome deve ter pelo menos 2 caracteres")
            .max(80, "Nome deve ter no máximo 80 caracteres"),
        email: emailSchema,
        password: passwordSchema,
        confirmPassword: z.string().min(1, "Confirme sua senha"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "As senhas não conferem",
    });

export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z
    .object({
        password: passwordSchema,
        confirmPassword: z.string().min(1, "Confirme sua senha"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "As senhas não conferem",
    });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
