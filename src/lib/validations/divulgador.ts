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
