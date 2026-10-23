import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
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
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { confirmPasswordReset } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Token de recuperação inválido ou ausente na URL.')
      return
    }
    if (password.length < 8) {
      setError('A nova senha deve possuir pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await confirmPasswordReset(token, password, confirmPassword)
      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi redefinida com sucesso. Faça login com as novas credenciais.',
      })
      navigate('/login')
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      setError(eObj?.message || 'Falha ao redefinir senha. O link pode ter expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center font-heading font-bold text-2xl shadow-md border border-[#D4AF37]/30 mb-3">
            GB
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] tracking-tight">
            Gesso Bettone
          </h1>
          <p className="text-sm text-[#616F7D] mt-1 font-sans">Análise de Vendas e Indicadores</p>
        </div>

        <Card className="border-[#DEE4EA] shadow-sm rounded-xl bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="font-heading text-xl font-bold text-[#2C3E50]">
              Redefinir sua senha
            </CardTitle>
            <CardDescription className="text-sm text-[#616F7D]">
              Crie uma nova senha de acesso segura para sua conta
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {!token && (
                <div className="p-3 bg-[#FBEFEE] text-[#C4453C] rounded-lg text-xs">
                  Atenção: Não encontramos o token na URL. Certifique-se de acessar pelo link exato
                  recebido no e-mail.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-[#2C3E50]">
                  Nova senha (mínimo 8 caracteres)
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite a nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-[#2C3E50]">
                  Confirmar nova senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                className="w-full bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold transition-colors"
                disabled={loading || !token}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </Button>
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#616F7D] hover:text-[#2C3E50] transition-colors"
                >
                  Voltar para o login
                </Link>{' '}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default ResetPassword
