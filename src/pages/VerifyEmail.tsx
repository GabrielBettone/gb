import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const { confirmVerification } = useAuth()

  useEffect(() => {
    let active = true

    async function verify() {
      if (!token) {
        setStatus('error')
        setErrorMessage('Token de verificação não encontrado na URL.')
        return
      }

      try {
        await confirmVerification(token)
        if (active) {
          setStatus('success')
        }
      } catch (err: unknown) {
        if (active) {
          const eObj = err as { message?: string }
          setStatus('error')
          setErrorMessage(eObj?.message || 'Falha ao confirmar verificação de e-mail.')
        }
      }
    }

    verify()

    return () => {
      active = false
    }
  }, [token, confirmVerification])

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1C4E3D] text-[#C2A24B] flex items-center justify-center font-bold text-2xl shadow-md border border-[#C2A24B]/30 mb-3">
            GB
          </div>
          <h1 className="text-2xl font-bold text-[#1C4E3D] tracking-tight">Gesso Bettone</h1>
          <p className="text-sm text-[#5B6470] mt-1">Análise de Vendas e Indicadores</p>
        </div>

        <Card className="border-[#E3E6EA] shadow-sm rounded-xl bg-white">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-[#22272A]">
              Verificação de E-mail
            </CardTitle>
            <CardDescription className="text-sm text-[#5B6470]">
              Confirmação de endereço e segurança da conta
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-[#1C4E3D] animate-spin" />
                <p className="text-sm text-[#5B6470]">Validando seu token de segurança...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EAF6EF] flex items-center justify-center text-[#2E7D5B]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-base text-[#2E7D5B]">
                  E-mail verificado com sucesso!
                </h3>
                <p className="text-xs text-[#5B6470] max-w-xs">
                  Sua conta foi validada. Agora você pode entrar e acessar todas as análises de
                  vendas da Gesso Bettone.
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#FBEFEE] flex items-center justify-center text-[#C4453C]">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-base text-[#C4453C]">Falha na verificação</h3>
                <p className="text-xs text-[#5B6470] max-w-xs">
                  {errorMessage || 'O link de verificação pode ter expirado ou é inválido.'}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link to="/login" className="w-full">
              <Button className="w-full bg-[#1C4E3D] hover:bg-[#163D30] text-white font-semibold">
                Ir para o login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default VerifyEmail
