import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Calendar, TrendingUp, TrendingDown, ShoppingCart, MessageCircle, Users } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface CartRecoveryStats {
  totalSessions: number
  abandonedSessions: number
  completedSessions: number
  conversionRate: number
  totalAttempts: number
  successfulAttempts: number
  responseRate: number
  revenueRecovered: number
}

interface CartSession {
  id: string
  session_id: string
  user_name: string
  user_email: string
  user_whatsapp: string
  amount: number
  status: string
  created_at: string
  abandoned_at?: string
  completed_at?: string
  subscription_plans: {
    name: string
  }
}

interface RecoveryAttempt {
  id: string
  attempt_number: number
  method: string
  status: string
  sent_at: string
  delivered_at?: string
  read_at?: string
  converted_at?: string
  cart_sessions: {
    user_name: string
    amount: number
    subscription_plans: {
      name: string
    }
  }
}

export function CartRecoveryAnalytics() {
  const [stats, setStats] = useState<CartRecoveryStats | null>(null)
  const [sessions, setSessions] = useState<CartSession[]>([])
  const [attempts, setAttempts] = useState<RecoveryAttempt[]>([])
  const [period, setPeriod] = useState('7d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Carregar estatísticas
      const { data: sessionsData } = await supabase
        .from('cart_sessions')
        .select(`
          *,
          subscription_plans(name)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      const { data: attemptsData } = await supabase
        .from('cart_recovery_attempts')
        .select(`
          *,
          cart_sessions(
            user_name,
            amount,
            subscription_plans(name)
          )
        `)
        .gte('sent_at', startDate.toISOString())
        .order('sent_at', { ascending: false })

      if (sessionsData) {
        setSessions(sessionsData)
        
        const totalSessions = sessionsData.length
        const abandonedSessions = sessionsData.filter(s => s.status === 'abandoned').length
        const completedSessions = sessionsData.filter(s => s.status === 'completed').length
        const conversionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
        const revenueRecovered = sessionsData
          .filter(s => s.status === 'completed')
          .reduce((sum, s) => sum + (s.amount || 0), 0)

        setStats({
          totalSessions,
          abandonedSessions,
          completedSessions,
          conversionRate,
          totalAttempts: attemptsData?.length || 0,
          successfulAttempts: attemptsData?.filter(a => a.status === 'converted').length || 0,
          responseRate: attemptsData && attemptsData.length > 0 
            ? (attemptsData.filter(a => a.status === 'read').length / attemptsData.length) * 100 
            : 0,
          revenueRecovered
        })
      }

      if (attemptsData) {
        setAttempts(attemptsData)
      }

    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      abandoned: 'destructive',
      completed: 'default',
      expired: 'secondary'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status === 'active' && 'Ativo'}
        {status === 'abandoned' && 'Abandonado'}
        {status === 'completed' && 'Completado'}
        {status === 'expired' && 'Expirado'}
      </Badge>
    )
  }

  const getAttemptStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      sent: 'default',
      delivered: 'default',
      read: 'default',
      failed: 'destructive',
      converted: 'default'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status === 'pending' && 'Pendente'}
        {status === 'sent' && 'Enviado'}
        {status === 'delivered' && 'Entregue'}
        {status === 'read' && 'Lido'}
        {status === 'failed' && 'Falhou'}
        {status === 'converted' && 'Convertido'}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics de Recuperação de Carrinho</h2>
          <p className="text-muted-foreground">
            Métricas e performance do sistema de recuperação
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessões Totais</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.abandonedSessions} abandonadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedSessions} conversões
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.responseRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.successfulAttempts} respostas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Recuperada</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.revenueRecovered.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Valor total recuperado
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress Bars */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Conversões</span>
                  <span>{stats.conversionRate.toFixed(1)}%</span>
                </div>
                <Progress value={stats.conversionRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats.completedSessions} de {stats.totalSessions} sessões convertidas
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxa de Resposta WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Respostas</span>
                  <span>{stats.responseRate.toFixed(1)}%</span>
                </div>
                <Progress value={stats.responseRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats.successfulAttempts} de {stats.totalAttempts} mensagens respondidas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sessões Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.slice(0, 10).map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.user_name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{session.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{session.subscription_plans?.name}</TableCell>
                  <TableCell>R$ {session.amount}</TableCell>
                  <TableCell>{getStatusBadge(session.status)}</TableCell>
                  <TableCell>
                    {new Date(session.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Attempts */}
      <Card>
        <CardHeader>
          <CardTitle>Tentativas de Recuperação</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tentativa</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.slice(0, 10).map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>
                    <div className="font-medium">
                      {attempt.cart_sessions?.user_name || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>#{attempt.attempt_number}</TableCell>
                  <TableCell className="capitalize">{attempt.method}</TableCell>
                  <TableCell>{getAttemptStatusBadge(attempt.status)}</TableCell>
                  <TableCell>
                    {new Date(attempt.sent_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 