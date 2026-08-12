import { z } from "zod";

export const divulgadorCadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export type DivulgadorCadastroInput = z.infer<typeof divulgadorCadastroSchema>;

export const divulgadorLoginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe sua senha."),
});

export type DivulgadorLoginInput = z.infer<typeof divulgadorLoginSchema>;

export const divulgadorForgotPasswordSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export type DivulgadorForgotPasswordInput = z.infer<typeof divulgadorForgotPasswordSchema>;

export const divulgadorNewPasswordSchema = z
  .object({
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmarSenha: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });

export type DivulgadorNewPasswordInput = z.infer<typeof divulgadorNewPasswordSchema>;
