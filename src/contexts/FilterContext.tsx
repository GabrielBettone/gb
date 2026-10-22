import React, { createContext, useContext, useState, useTransition } from 'react'
import type { FiltrosGlobais } from '@/types'

interface FilterContextType {
  filtros: FiltrosGlobais
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosGlobais>>
  atualizarFiltro: <K extends keyof FiltrosGlobais>(campo: K, valor: FiltrosGlobais[K]) => void
  limparFiltros: () => void
  importModalOpen: boolean
  setImportModalOpen: (open: boolean) => void
}

const defaultFiltros: FiltrosGlobais = {
  periodoPredefinido: '30d',
  dataInicio: '',
  dataFim: '',
  produtoId: '',
  canal: '',
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filtros, setFiltros] = useState<FiltrosGlobais>(defaultFiltros)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [, startTransition] = useTransition()

  const atualizarFiltro = <K extends keyof FiltrosGlobais>(campo: K, valor: FiltrosGlobais[K]) => {
    startTransition(() => {
      setFiltros((prev) => ({
        ...prev,
        [campo]: valor,
      }))
    })
  }

  const limparFiltros = () => {
    startTransition(() => {
      setFiltros(defaultFiltros)
    })
  }

  return (
    <FilterContext.Provider
      value={{
        filtros,
        setFiltros,
        atualizarFiltro,
        limparFiltros,
        importModalOpen,
        setImportModalOpen,
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export const useFilters = () => {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilters deve ser usado dentro de um FilterProvider')
  }
  return context
}
