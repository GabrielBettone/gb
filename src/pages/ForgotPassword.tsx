import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const { requestPasswordReset } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Por favor, informe seu e-mail.')
      return
    }
    setError('')
    setLoading(true)

    try {
      await requestPasswordReset(email)
      setSubmitted(true)
      toast({
        title: 'E-mail enviado',
        description: 'As instruções para redefinição foram enviadas para seu endereço de e-mail.',
      })
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar',
        description:
          eObj?.message || 'Não foi possível solicitar a recuperação. Tente novamente mais tarde.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-20 w-auto p-2 rounded-2xl bg-white shadow-md border border-[#DEE4EA] mb-3 flex items-center justify-center">
            <img
              src="/src/assets/logo-6927a.svg"
              alt="Gesso Bettone"
              className="h-full w-auto object-contain"
            />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] tracking-tight">
            Gesso Bettone
          </h1>
          <p className="text-sm text-[#616F7D] mt-1 font-sans">Recuperação de Acesso</p>
        </div>
        <Card className="border-[#DEE4EA] shadow-sm rounded-xl bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              Recuperar senha
            </CardTitle>
            <CardDescription className="text-sm text-[#616F7D]">
              Informe seu e-mail cadastrado para receber o link de redefinição
            </CardDescription>
          </CardHeader>
          {submitted ? (
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[#EAF6EF] border border-[#2E7D5B]/20 text-[#2E7D5B]">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Instruções enviadas com sucesso!</p>
                  <p className="text-xs mt-1 text-[#2E7D5B]/90">
                    Se o endereço <strong>{email}</strong> estiver cadastrado em nosso sistema, você
                    receberá um link em alguns instantes.
                  </p>
                </div>
              </div>
              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-semibold text-[#2C3E50] hover:text-[#D4AF37]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para o login
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-[#2C3E50]">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@gessobettone.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={error ? 'border-destructive' : ''}
                    disabled={loading}
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-2">
                <Button
                  type="submit"
                  className="w-full bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </Button>
                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-xs font-semibold text-[#616F7D] hover:text-[#2C3E50] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Voltar para o login
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

export default ForgotPassword
