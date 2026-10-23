import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ConfirmEmailChange = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { confirmEmailChange } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Token de alteração de e-mail ausente na URL.')
      return
    }
    if (!password) {
      setError('Digite sua senha para confirmar a mudança.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await confirmEmailChange(token, password)
      toast({
        title: 'E-mail alterado com sucesso!',
        description: 'Sua conta foi deslogada. Entre utilizando seu novo endereço de e-mail.',
      })
      navigate('/login')
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      setError(eObj?.message || 'Falha ao confirmar alteração de e-mail. Verifique sua senha.')
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
          <p className="text-sm text-[#5B6470] mt-1">Análise de Vendas e Indicadores</p>
        </div>

        <Card className="border-[#E3E6EA] shadow-sm rounded-xl bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-[#22272A]">
              Confirmar novo e-mail
            </CardTitle>
            <CardDescription className="text-sm text-[#5B6470]">
              Digite sua senha para validar a troca definitiva de endereço
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {!token && (
                <div className="p-3 bg-[#FBEFEE] text-[#C4453C] rounded-lg text-xs">
                  Token não identificado na URL. Verifique o link enviado para o novo e-mail.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-[#22272A]">
                  Sua senha atual
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Confirme sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    Confirmando...
                  </>
                ) : (
                  'Confirmar alteração'
                )}
              </Button>
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#616F7D] hover:text-[#2C3E50]"
                >
                  Voltar para o login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default ConfirmEmailChange
