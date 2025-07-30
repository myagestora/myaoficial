import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Mail, TestTube, CheckCircle, XCircle } from 'lucide-react'

interface SMTPConfig {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  from_email: string
  from_name: string
}

export function EmailSMTPConfig() {
  const [config, setConfig] = useState<SMTPConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)

      // Carregar configurações SMTP
      const { data: configData } = await supabase
        .from('system_config')
        .select('*')
        .in('key', [
          'smtp_enabled',
          'smtp_host',
          'smtp_port',
          'smtp_secure',
          'smtp_username',
          'smtp_password',
          'smtp_from_email',
          'smtp_from_name'
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

        setConfig({
          enabled: configObj.smtp_enabled === 'true',
          host: configObj.smtp_host || '',
          port: parseInt(configObj.smtp_port) || 587,
          secure: configObj.smtp_secure === 'true',
          username: configObj.smtp_username || '',
          password: configObj.smtp_password || '',
          from_email: configObj.smtp_from_email || '',
          from_name: configObj.smtp_from_name || ''
        })
      }

    } catch (error) {
      console.error('Error loading SMTP config:', error)
      toast.error('Erro ao carregar configurações SMTP')
    } finally {
      setLoading(false)
    }
  }

  const [localConfig, setLocalConfig] = useState<SMTPConfig | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (config) {
      setLocalConfig(config)
    }
  }, [config])

  const updateLocalConfig = (updates: Partial<SMTPConfig>) => {
    if (!localConfig) return
    
    const newConfig = { ...localConfig, ...updates }
    setLocalConfig(newConfig)
    setHasChanges(true)
  }

  const saveConfig = async () => {
    if (!localConfig) return

    try {
      setSaving(true)

      // Salvar configurações
      const configToSave = [
        { key: 'smtp_enabled', value: localConfig.enabled.toString() },
        { key: 'smtp_host', value: localConfig.host },
        { key: 'smtp_port', value: localConfig.port.toString() },
        { key: 'smtp_secure', value: localConfig.secure.toString() },
        { key: 'smtp_username', value: localConfig.username },
        { key: 'smtp_password', value: localConfig.password },
        { key: 'smtp_from_email', value: localConfig.from_email },
        { key: 'smtp_from_name', value: localConfig.from_name }
      ]

      for (const item of configToSave) {
        console.log('Salvando configuração SMTP:', { key: item.key, value: item.value })
        
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
          console.error('Erro ao salvar configuração SMTP:', item.key, error)
          throw error
        }
      }

      setConfig(localConfig)
      setHasChanges(false)
      toast.success('Configuração SMTP salva com sucesso!')

    } catch (error) {
      console.error('Error saving SMTP config:', error)
      toast.error('Erro ao salvar configuração SMTP')
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

  const testConnection = async () => {
    if (!config?.host || !config?.username || !config?.password) {
      toast.error('Configure host, usuário e senha antes de testar')
      return
    }

    try {
      setTesting(true)

      const { error } = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          host: config.host,
          port: config.port,
          secure: config.secure,
          username: config.username,
          password: config.password,
          from_email: config.from_email,
          from_name: config.from_name
        }
      })

      if (error) {
        throw error
      }

      toast.success('Conexão SMTP testada com sucesso!')

    } catch (error) {
      console.error('Error testing SMTP connection:', error)
      toast.error('Erro ao testar conexão SMTP')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuração SMTP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📧 Configuração SMTP
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
                <Label className="text-base font-medium">Habilitar SMTP</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar envio de e-mails via SMTP
                </p>
              </div>
                              <Switch
                  checked={localConfig?.enabled || false}
                  onCheckedChange={(checked) => updateLocalConfig({ enabled: checked })}
                  disabled={saving}
                />
            </div>

            <Separator />

            {/* Configurações do Servidor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">Servidor SMTP</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.gmail.com"
                  value={localConfig?.host || ''}
                  onChange={(e) => updateLocalConfig({ host: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-port">Porta</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="587"
                  value={localConfig?.port || 587}
                  onChange={(e) => updateLocalConfig({ port: parseInt(e.target.value) })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-secure">Conexão Segura</Label>
                <Select
                  value={localConfig?.secure ? 'true' : 'false'}
                  onValueChange={(value) => updateLocalConfig({ secure: value === 'true' })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">SSL/TLS</SelectItem>
                    <SelectItem value="false">Sem SSL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-username">Usuário</Label>
                <Input
                  id="smtp-username"
                  placeholder="seu-email@gmail.com"
                  value={localConfig?.username || ''}
                  onChange={(e) => updateLocalConfig({ username: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-password">Senha</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  placeholder="Sua senha ou app password"
                  value={localConfig?.password || ''}
                  onChange={(e) => updateLocalConfig({ password: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-from-email">E-mail Remetente</Label>
                <Input
                  id="smtp-from-email"
                  type="email"
                  placeholder="noreply@seu-site.com"
                  value={localConfig?.from_email || ''}
                  onChange={(e) => updateLocalConfig({ from_email: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-from-name">Nome Remetente</Label>
                <Input
                  id="smtp-from-name"
                  placeholder="MYA Gestora"
                  value={localConfig?.from_name || ''}
                  onChange={(e) => updateLocalConfig({ from_name: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Configurações Comuns */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configurações Comuns</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Gmail</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      smtp.gmail.com:587 (SSL)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                                             onClick={() => {
                         updateLocalConfig({
                           host: 'smtp.gmail.com',
                           port: 587,
                           secure: true
                         })
                       }}
                      disabled={saving}
                    >
                      Usar Gmail
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Outlook</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      smtp-mail.outlook.com:587 (SSL)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                                             onClick={() => {
                         updateLocalConfig({
                           host: 'smtp-mail.outlook.com',
                           port: 587,
                           secure: true
                         })
                       }}
                      disabled={saving}
                    >
                      Usar Outlook
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">Yahoo</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      smtp.mail.yahoo.com:587 (SSL)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                                             onClick={() => {
                         updateLocalConfig({
                           host: 'smtp.mail.yahoo.com',
                           port: 587,
                           secure: true
                         })
                       }}
                      disabled={saving}
                    >
                      Usar Yahoo
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Teste de Conexão */}
            <div className="space-y-4">
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Teste de Conexão</h3>
                  <p className="text-sm text-muted-foreground">
                    Teste se as configurações SMTP estão corretas
                  </p>
                </div>
                <Button
                  onClick={testConnection}
                  disabled={testing || !config?.enabled}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Dica:</strong> Para Gmail, use uma "App Password" em vez da senha normal. 
                  Ative a verificação em duas etapas e gere uma senha de app específica.
                </AlertDescription>
              </Alert>
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 