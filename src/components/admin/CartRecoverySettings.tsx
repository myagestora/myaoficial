import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

interface CartRecoveryConfig {
  enabled: boolean
  whatsapp_enabled: boolean
  email_enabled: boolean
  max_attempts: number
  delay_minutes: number
}

interface CartRecoveryTemplate {
  id: string
  name: string
  type: 'whatsapp' | 'email'
  subject?: string
  content: string
  variables: Record<string, string>
  is_active: boolean
}

export function CartRecoverySettings() {
  const [config, setConfig] = useState<CartRecoveryConfig | null>(null)
  const [localConfig, setLocalConfig] = useState<CartRecoveryConfig | null>(null)
  const [templates, setTemplates] = useState<CartRecoveryTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [previewType, setPreviewType] = useState<'whatsapp' | 'email'>('whatsapp')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (config) {
      setLocalConfig(config)
    }
  }, [config])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar configuração
      const { data: configData } = await supabase
        .from('system_config')
        .select('*')
        .in('key', [
          'cart_recovery_enabled',
          'cart_recovery_whatsapp_enabled',
          'cart_recovery_email_enabled',
          'cart_recovery_max_attempts',
          'cart_recovery_delay_minutes'
        ])

      if (configData) {
        const configObj: any = {}
        configData.forEach(item => {
          // Tratar o valor corretamente baseado no tipo
          let value = item.value
          if (typeof value === 'string') {
            value = value.replace(/^"|"$/g, '')
          } else if (typeof value === 'object') {
            value = JSON.stringify(value).replace(/^"|"$/g, '')
          }
          configObj[item.key] = value
        })

        const recoveryConfig: CartRecoveryConfig = {
          enabled: configObj.cart_recovery_enabled === 'true',
          whatsapp_enabled: configObj.cart_recovery_whatsapp_enabled === 'true',
          email_enabled: configObj.cart_recovery_email_enabled === 'true',
          max_attempts: parseInt(configObj.cart_recovery_max_attempts) || 3,
          delay_minutes: parseInt(configObj.cart_recovery_delay_minutes) || 60
        }

        setConfig(recoveryConfig)
        setLocalConfig(recoveryConfig)

        // Gerar templates baseado no número de tentativas
        const maxAttempts = recoveryConfig.max_attempts || 3
        const generatedTemplates = generateTemplates(maxAttempts)
        setTemplates(generatedTemplates)
      }

    } catch (error) {
      console.error('Error loading cart recovery data:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const updateLocalConfig = (updates: Partial<CartRecoveryConfig>) => {
    if (!localConfig) return
    
    const newConfig = { ...localConfig, ...updates }
    setLocalConfig(newConfig)
    setHasChanges(true)

    // Se o número de tentativas mudou, regenerar templates
    if (updates.max_attempts && updates.max_attempts !== localConfig.max_attempts) {
      const newTemplates = generateTemplates(updates.max_attempts)
      setTemplates(newTemplates)
      toast.success(`${updates.max_attempts} templates gerados automaticamente!`)
    }
  }

  const saveConfig = async () => {
    if (!localConfig) return

    try {
      setSaving(true)

      // Salvar configurações
      const configToSave = [
        { key: 'cart_recovery_enabled', value: localConfig.enabled.toString() },
        { key: 'cart_recovery_whatsapp_enabled', value: localConfig.whatsapp_enabled.toString() },
        { key: 'cart_recovery_email_enabled', value: localConfig.email_enabled.toString() },
        { key: 'cart_recovery_max_attempts', value: localConfig.max_attempts.toString() },
        { key: 'cart_recovery_delay_minutes', value: localConfig.delay_minutes.toString() }
      ]

      for (const item of configToSave) {
        console.log('Salvando configuração Cart Recovery:', { key: item.key, value: item.value })
        
        const { error } = await supabase
          .from('system_config')
          .upsert({
            key: item.key,
            value: JSON.stringify(item.value),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          })

        if (error) {
          console.error('Erro ao salvar configuração Cart Recovery:', item.key, error)
          throw error
        }
      }

      // Sincronizar templates se o número de tentativas mudou
      if (config && config.max_attempts !== localConfig.max_attempts) {
        console.log('🔄 Número de tentativas mudou, sincronizando templates...')
        await syncTemplates()
      }

      setConfig(localConfig)
      setHasChanges(false)
      toast.success('Configuração salva com sucesso!')

    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const cancelChanges = () => {
    if (config) {
      setLocalConfig(config)
      setHasChanges(false)
    }
  }

  const syncTemplates = async () => {
    try {
      console.log('🔄 Sincronizando templates...')
      
      const { data, error } = await supabase.functions.invoke('manage-cart-templates', {
        body: { action: 'sync' }
      })

      if (error) {
        console.error('Erro ao sincronizar templates:', error)
        toast.error('Erro ao sincronizar templates')
        return
      }

      if (data?.success) {
        console.log('✅ Templates sincronizados:', data.results)
        toast.success(`Templates sincronizados: ${data.results.created} criados, ${data.results.deleted} removidos`)
        
        // Recarregar templates
        await loadData()
      }
    } catch (error) {
      console.error('Erro ao sincronizar templates:', error)
      toast.error('Erro ao sincronizar templates')
    }
  }

  const updateTemplate = async (templateId: string, updates: Partial<CartRecoveryTemplate>) => {
    try {
      setSaving(true)

      // Simular atualização de template
      setTemplates(templates.map(t => 
        t.id === templateId ? { ...t, ...updates } : t
      ))

      toast.success('Template atualizado com sucesso!')

    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('Erro ao atualizar template')
    } finally {
      setSaving(false)
    }
  }

  const generateTemplates = (maxAttempts: number) => {
    const newTemplates: CartRecoveryTemplate[] = []
    
    // Templates WhatsApp
    for (let i = 1; i <= maxAttempts; i++) {
      const attemptNumber = i
      const isFirstAttempt = i === 1
      
      let content = ''
      let variables: Record<string, string> = {
        user_name: 'Nome do usuário',
        plan_name: 'Nome do plano',
        frequency: 'Frequência',
        checkout_url: 'URL do checkout'
      }

      if (isFirstAttempt) {
        content = 'Olá {{user_name}}! 👋\n\nNotamos que você estava interessado no plano {{plan_name}} por R$ {{amount}}/{{frequency}}.\n\nSua sessão ainda está ativa! Que tal finalizar sua assinatura agora?\n\n🔗 Acesse: {{checkout_url}}\n\n⏰ Oferta válida por mais 24 horas!\n\nPrecisa de ajuda? Responda esta mensagem!'
        variables.amount = 'Valor'
      } else if (i === 2) {
        content = '{{user_name}}, tudo bem? 😊\n\nVocê ainda tem interesse no {{plan_name}}?\n\n🎁 **Oferta especial**: 10% de desconto por 24h!\nDe R$ {{original_amount}} por R$ {{discount_amount}}/{{frequency}}\n\n🔗 Acesse: {{checkout_url}}\n\n💬 Dúvidas? Estamos aqui para ajudar!'
        variables.original_amount = 'Valor original'
        variables.discount_amount = 'Valor com desconto'
      } else if (i === 3) {
        content = '{{user_name}}, última chance! ⏰\n\nO {{plan_name}} está com 15% de desconto por mais 2 horas!\n\n💰 De R$ {{original_amount}} por R$ {{final_amount}}/{{frequency}}\n\n🔗 Acesse agora: {{checkout_url}}\n\nApós esse prazo, o desconto expira!'
        variables.original_amount = 'Valor original'
        variables.final_amount = 'Valor final'
      } else {
        // Tentativas adicionais (4, 5, etc.)
        const discountPercent = Math.min(10 + (i - 2) * 5, 30) // Máximo 30% de desconto
        content = `{{user_name}}, ${i === maxAttempts ? 'última oportunidade' : `${i}ª tentativa`}! 🎯\n\nO {{plan_name}} está com ${discountPercent}% de desconto!\n\n💰 De R$ {{original_amount}} por R$ {{discount_amount}}/{{frequency}}\n\n🔗 Acesse: {{checkout_url}}\n\n${i === maxAttempts ? 'Esta é sua última chance!' : 'Não perca essa oportunidade!'}`
        variables.original_amount = 'Valor original'
        variables.discount_amount = 'Valor com desconto'
      }

      newTemplates.push({
        id: `whatsapp-${i}`,
        name: `${i}ª Tentativa`,
        type: 'whatsapp',
        content,
        variables,
        is_active: true
      })

      // Templates E-mail
      let emailContent = ''
      let emailSubject = ''

      if (isFirstAttempt) {
        emailSubject = 'Complete sua assinatura - {{plan_name}}'
        emailContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Olá {{user_name}}!</h2>
  
  <p>Notamos que você estava interessado no plano <strong>{{plan_name}}</strong> por <strong>R$ {{amount}}/{{frequency}}</strong>.</p>
  
  <p>Sua sessão ainda está ativa! Que tal finalizar sua assinatura agora?</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{checkout_url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Finalizar Assinatura
    </a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">
    ⏰ Oferta válida por mais 24 horas!
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #6b7280; font-size: 12px;">
    Precisa de ajuda? Responda este e-mail ou entre em contato conosco.
  </p>
</div>`
      } else if (i === 2) {
        emailSubject = 'Oferta especial: 10% de desconto - {{plan_name}}'
        emailContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">{{user_name}}, tudo bem?</h2>
  
  <p>Você ainda tem interesse no <strong>{{plan_name}}</strong>?</p>
  
  <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="color: #d97706; margin: 0 0 10px 0;">🎁 Oferta Especial: 10% de desconto por 24h!</h3>
    <p style="margin: 0;">
      <span style="text-decoration: line-through; color: #6b7280;">De R$ {{original_amount}}</span>
      <br>
      <span style="font-size: 18px; font-weight: bold; color: #059669;">Por R$ {{discount_amount}}/{{frequency}}</span>
    </p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{checkout_url}}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Aproveitar Desconto
    </a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #6b7280; font-size: 12px;">
    Dúvidas? Estamos aqui para ajudar!
  </p>
</div>`
      } else if (i === 3) {
        emailSubject = 'Última chance: 15% de desconto - {{plan_name}}'
        emailContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">{{user_name}}, última chance!</h2>
  
  <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="color: #dc2626; margin: 0 0 10px 0;">⏰ Oferta por tempo limitado!</h3>
    <p style="margin: 0;">
      O <strong>{{plan_name}}</strong> está com <strong>15% de desconto</strong> por mais 2 horas!
    </p>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <span style="text-decoration: line-through; color: #6b7280; font-size: 16px;">R$ {{original_amount}}</span>
    <br>
    <span style="font-size: 24px; font-weight: bold; color: #dc2626;">R$ {{final_amount}}/{{frequency}}</span>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{checkout_url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Aproveitar Agora
    </a>
  </div>
  
  <p style="color: #dc2626; font-weight: bold; text-align: center;">
    ⚠️ Após esse prazo, o desconto expira!
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #6b7280; font-size: 12px; text-align: center;">
    Esta é sua última oportunidade de aproveitar este desconto especial.
  </p>
</div>`
      } else {
        // Tentativas adicionais (4, 5, etc.)
        const discountPercent = Math.min(10 + (i - 2) * 5, 30)
        emailSubject = `${i === maxAttempts ? 'Última chance' : `${i}ª tentativa`}: ${discountPercent}% de desconto - {{plan_name}}`
        emailContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">{{user_name}}, ${i === maxAttempts ? 'última oportunidade' : `${i}ª tentativa`}!</h2>
  
  <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="color: #dc2626; margin: 0 0 10px 0;">🎯 Oferta especial: ${discountPercent}% de desconto!</h3>
    <p style="margin: 0;">
      O <strong>{{plan_name}}</strong> está com <strong>${discountPercent}% de desconto</strong>!
    </p>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <span style="text-decoration: line-through; color: #6b7280; font-size: 16px;">R$ {{original_amount}}</span>
    <br>
    <span style="font-size: 24px; font-weight: bold; color: #dc2626;">R$ {{discount_amount}}/{{frequency}}</span>
  </div>
  
  <div style="text-align: string; margin: 30px 0;">
    <a href="{{checkout_url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Aproveitar Agora
    </a>
  </div>
  
  <p style="color: #dc2626; font-weight: bold; text-align: center;">
    ${i === maxAttempts ? '⚠️ Esta é sua última chance!' : '⏰ Não perca essa oportunidade!'}
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #6b7280; font-size: 12px; text-align: center;">
    ${i === maxAttempts ? 'Esta é sua última oportunidade de aproveitar este desconto especial.' : 'Aproveite enquanto ainda há tempo!'}
  </p>
</div>`
      }

      newTemplates.push({
        id: `email-${i}`,
        name: `${i}ª Tentativa`,
        type: 'email',
        subject: emailSubject,
        content: emailContent,
        variables: { ...variables },
        is_active: true
      })
    }

    return newTemplates
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recuperação de Carrinho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🛒 Recuperação de Carrinho
            <Badge variant={localConfig?.enabled ? "default" : "secondary"}>
              {localConfig?.enabled ? "Ativo" : "Inativo"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuração Geral */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Habilitar Recuperação de Carrinho</Label>
                <p className="text-sm text-muted-foreground">
                  Sistema automático de recuperação de carrinhos abandonados
                </p>
              </div>
              <Switch
                checked={localConfig?.enabled || false}
                onCheckedChange={(checked) => updateLocalConfig({ enabled: checked })}
                disabled={saving}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-attempts">Máximo de Tentativas</Label>
                <Input
                  id="max-attempts"
                  type="number"
                  min="1"
                  max="10"
                  value={localConfig?.max_attempts || 3}
                  onChange={(e) => updateLocalConfig({ max_attempts: parseInt(e.target.value) })}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Número máximo de mensagens enviadas por carrinho
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay-minutes">Intervalo entre Tentativas (minutos)</Label>
                <Input
                  id="delay-minutes"
                  type="number"
                  min="15"
                  max="1440"
                  value={localConfig?.delay_minutes || 60}
                  onChange={(e) => updateLocalConfig({ delay_minutes: parseInt(e.target.value) })}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo entre cada tentativa de recuperação
                </p>
              </div>
            </div>
          </div>

          {/* Canais de Comunicação */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Canais de Comunicação</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    📱
                  </div>
                  <div>
                    <Label className="font-medium">WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagens via WhatsApp
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localConfig?.whatsapp_enabled || false}
                  onCheckedChange={(checked) => updateLocalConfig({ whatsapp_enabled: checked })}
                  disabled={saving || !localConfig?.enabled}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    📧
                  </div>
                  <div>
                    <Label className="font-medium">E-mail</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar e-mails de recuperação
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localConfig?.email_enabled || false}
                  onCheckedChange={(checked) => updateLocalConfig({ email_enabled: checked })}
                  disabled={saving || !localConfig?.enabled}
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          {hasChanges && (
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={saveConfig} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button variant="outline" onClick={cancelChanges} disabled={saving}>
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates de Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Templates de Mensagens</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="whatsapp" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="email">E-mail</TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="space-y-6">
              {/* Header com estatísticas */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">📱</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-green-900">Templates WhatsApp</h3>
                    <p className="text-sm text-green-700">
                      {templates.filter(t => t.type === 'whatsapp' && t.is_active).length} de {templates.filter(t => t.type === 'whatsapp').length} ativos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-600">Recuperação via WhatsApp</p>
                  <p className="text-xs text-green-500">Mensagens automáticas</p>
                </div>
              </div>

              {/* Grid de templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {templates
                  .filter(t => t.type === 'whatsapp')
                  .map((template, index) => (
                    <div key={template.id} className="group relative">
                      {/* Indicador de tentativa */}
                      <div className="absolute -top-2 -left-2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold z-10">
                        {index + 1}
                      </div>
                      
                      <Card className={`transition-all duration-200 hover:shadow-lg h-full ${template.is_active ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-lg">{template.name}</h4>
                                <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                                  {template.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Enviada após {index === 0 ? 'abandono' : `${index + 1}ª tentativa`}
                              </p>
                            </div>
                            <Switch
                              checked={template.is_active}
                              onCheckedChange={(checked) => updateTemplate(template.id, { is_active: checked })}
                              disabled={saving}
                            />
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Editor sempre aberto */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Mensagem WhatsApp</Label>
                            <div className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  Editor de mensagem - Use as variáveis abaixo no conteúdo
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewContent(template.content)
                                    setPreviewType('whatsapp')
                                    setPreviewModalOpen(true)
                                  }}
                                  className="text-xs"
                                >
                                  👁️ Ver Preview
                                </Button>
                              </div>
                              <Textarea
                                value={template.content}
                                onChange={(e) => updateTemplate(template.id, { content: e.target.value })}
                                rows={10}
                                disabled={saving}
                                placeholder="Digite sua mensagem aqui..."
                                className="font-mono text-sm border-0 rounded-none resize-none"
                              />
                            </div>
                          </div>

                          {/* Variáveis */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-blue-600">🔧</span>
                              <p className="text-sm font-medium text-blue-900">Variáveis disponíveis</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(template.variables).map(([key, description]) => (
                                <div key={key} className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border border-blue-200">
                                  <code className="text-blue-700 font-mono">{`{{${key}}}`}</code>
                                  <span className="text-blue-600">•</span>
                                  <span className="text-blue-800">{description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-6">
              {/* Header com estatísticas */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">📧</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-blue-900">Templates E-mail</h3>
                    <p className="text-sm text-blue-700">
                      {templates.filter(t => t.type === 'email' && t.is_active).length} de {templates.filter(t => t.type === 'email').length} ativos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-600">Recuperação via E-mail</p>
                  <p className="text-xs text-blue-500">E-mails automáticos</p>
                </div>
              </div>

              {/* Grid de templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {templates
                  .filter(t => t.type === 'email')
                  .map((template, index) => (
                    <div key={template.id} className="group relative">
                      {/* Indicador de tentativa */}
                      <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold z-10">
                        {index + 1}
                      </div>
                      
                      <Card className={`transition-all duration-200 hover:shadow-lg h-full ${template.is_active ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-lg">{template.name}</h4>
                                <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                                  {template.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Enviado após {index === 0 ? 'abandono' : `${index + 1}ª tentativa`}
                              </p>
                            </div>
                            <Switch
                              checked={template.is_active}
                              onCheckedChange={(checked) => updateTemplate(template.id, { is_active: checked })}
                              disabled={saving}
                            />
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Assunto */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Assunto do E-mail</Label>
                            <Input
                              value={template.subject || ''}
                              onChange={(e) => updateTemplate(template.id, { subject: e.target.value })}
                              disabled={saving}
                              placeholder="Digite o assunto do e-mail..."
                              className="font-medium"
                            />
                          </div>

                          {/* Editor sempre aberto */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Conteúdo HTML</Label>
                            <div className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  Editor HTML - Use as variáveis abaixo no conteúdo
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewContent(template.content)
                                    setPreviewType('email')
                                    setPreviewModalOpen(true)
                                  }}
                                  className="text-xs"
                                >
                                  👁️ Ver Preview
                                </Button>
                              </div>
                              <Textarea
                                value={template.content}
                                onChange={(e) => updateTemplate(template.id, { content: e.target.value })}
                                rows={10}
                                disabled={saving}
                                placeholder="Digite o conteúdo HTML do e-mail..."
                                className="font-mono text-sm border-0 rounded-none resize-none"
                              />
                            </div>
                          </div>

                          {/* Variáveis */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-blue-600">🔧</span>
                              <p className="text-sm font-medium text-blue-900">Variáveis disponíveis</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(template.variables).map(([key, description]) => (
                                <div key={key} className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border border-blue-200">
                                  <code className="text-blue-700 font-mono">{`{{${key}}}`}</code>
                                  <span className="text-blue-600">•</span>
                                  <span className="text-blue-800">{description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Preview */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewType === 'whatsapp' ? '📱' : '📧'} Preview do Template
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {previewType === 'whatsapp' ? (
              /* Preview WhatsApp */
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm whitespace-pre-wrap text-gray-700">
                    {previewContent}
                  </div>
                </div>
              </div>
            ) : (
              /* Preview E-mail */
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div 
                    className="text-sm text-gray-700"
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setPreviewModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 