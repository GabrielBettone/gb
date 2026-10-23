import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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

const Login = () => {
  const [email, setEmail] = useState('gabrielgiovani@msn.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/painel'

  const validate = () => {
    const errs: { email?: string; password?: string } = {}
    if (!email) {
      errs.email = 'O e-mail é obrigatório.'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Insira um e-mail válido.'
    }

    if (!password) {
      errs.password = 'A senha é obrigatória.'
    } else if (password.length < 8) {
      errs.password = 'A senha deve conter pelo menos 8 caracteres.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await login(email, password)
      toast({
        title: 'Bem-vindo de volta!',
        description: 'Sessão iniciada com sucesso na Análise de Vendas Bettone.',
      })
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Falha no login',
        description: error?.message || 'E-mail ou senha incorretos. Verifique suas credenciais.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center font-heading font-bold text-2xl shadow-md border border-[#D4AF37]/30 mb-3">
            GB
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#2C3E50] tracking-tight">
            Gesso Bettone
          </h1>
          <p className="text-sm text-[#616F7D] mt-1">Análise de Vendas e Indicadores</p>
        </div>

        <Card className="border-[#E3E6EA] shadow-sm rounded-xl bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-[#22272A]">
              Acessar análise de vendas
            </CardTitle>
            <CardDescription className="text-sm text-[#5B6470]">
              Informe suas credenciais para visualizar relatórios e indicadores
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-[#22272A]">
                  E-mail institucional
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@gessobettone.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={
                    errors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                  }
                  disabled={loading}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-[#22272A]">
                    Senha
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[#2C3E50] hover:text-[#D4AF37] hover:underline transition-colors font-medium"
                  >
                    Esqueceu a senha?
                  </Link>{' '}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha secreta"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    disabled={loading}
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
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
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
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
              <p className="text-center text-xs text-[#5B6470]">
                Ainda não tem acesso?{' '}
                <Link
                  to="/register"
                  className="font-bold text-[#2C3E50] hover:text-[#D4AF37] hover:underline"
                >
                  Solicite seu acesso
                </Link>{' '}
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default Login
