import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { QrCode, Smartphone, Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

interface WhatsAppConfig {
  enabled: boolean
  evolution_api_url: string
  evolution_api_key: string
  instance_name: string
  webhook_url: string
}

interface InstanceStatus {
  instance: string
  status: 'open' | 'connecting' | 'close' | 'qrRead' | 'qrReadError' | 'qrReadSuccess' | 'not_found'
  qrcode?: string
  error?: string
  exists?: boolean
}

export function WhatsAppManager() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [localConfig, setLocalConfig] = useState<WhatsAppConfig | null>(null)
  const [instanceStatus, setInstanceStatus] = useState<InstanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string>('')
  const [connectionCheckInterval, setConnectionCheckInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadConfig()
    
    // Cleanup: parar monitoramento quando componente desmontar
    return () => {
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval)
      }
    }
  }, [])

  useEffect(() => {
    if (config) {
      setLocalConfig(config)
    }
  }, [config])

  const loadConfig = async () => {
    try {
      setLoading(true)

      // Carregar configurações do WhatsApp
      const { data: configData } = await supabase
        .from('system_config')
        .select('*')
        .in('key', [
          'whatsapp_enabled',
          'evolution_api_url',
          'evolution_api_key',
          'evolution_instance_name',
          'evolution_webhook_url'
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

        const whatsappConfig: WhatsAppConfig = {
          enabled: configObj.whatsapp_enabled === 'true',
          evolution_api_url: configObj.evolution_api_url || '',
          evolution_api_key: configObj.evolution_api_key || '',
          instance_name: configObj.evolution_instance_name || '',
          webhook_url: configObj.evolution_webhook_url || ''
        }

        setConfig(whatsappConfig)
        setLocalConfig(whatsappConfig)
      }

      // Verificar status da instância
      await checkInstanceStatus()

    } catch (error) {
      console.error('Error loading WhatsApp config:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const updateLocalConfig = (updates: Partial<WhatsAppConfig>) => {
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
        { key: 'whatsapp_enabled', value: localConfig.enabled.toString() },
        { key: 'evolution_api_url', value: localConfig.evolution_api_url },
        { key: 'evolution_api_key', value: localConfig.evolution_api_key },
        { key: 'evolution_instance_name', value: localConfig.instance_name },
        { key: 'evolution_webhook_url', value: localConfig.webhook_url }
      ]

      for (const item of configToSave) {
        console.log('Salvando configuração WhatsApp:', { key: item.key, value: item.value })
        
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
          console.error('Erro ao salvar configuração:', item.key, error)
          throw error
        }
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

  const checkInstanceStatus = async () => {
    if (!localConfig?.evolution_api_url || !localConfig?.evolution_api_key || !localConfig?.instance_name) {
      console.log('Configurações incompletas para verificar status:', {
        url: localConfig?.evolution_api_url,
        hasKey: !!localConfig?.evolution_api_key,
        instance: localConfig?.instance_name
      })
      return
    }

    // Validar se a URL é válida
    try {
      new URL(localConfig.evolution_api_url)
    } catch (error) {
      console.error('URL inválida:', localConfig.evolution_api_url)
      setInstanceStatus({
        instance: localConfig.instance_name,
        status: 'close',
        error: 'URL da API inválida. Use um formato como: https://api.evolution.com'
      })
      return
    }

    try {
      setCheckingStatus(true)

      const url = `${localConfig.evolution_api_url}/instance/connectionState/${localConfig.instance_name}`
      console.log('Verificando status da instância:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': localConfig.evolution_api_key,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const responseText = await response.text()
        console.log('Resposta da API:', responseText)
        
        try {
          const data = JSON.parse(responseText)
          console.log('Status da instância:', data)
          
          // A API retorna {instance: {instanceName, state}}
          // Precisamos extrair os dados corretos
          if (data.instance) {
            const statusData = {
              instance: data.instance.instanceName || localConfig.instance_name,
              status: data.instance.state || 'close',
              error: undefined,
              exists: true
            }
            console.log('Status processado:', statusData)
            setInstanceStatus(statusData)
          } else {
            // Fallback para formato direto
            const statusData = {
              instance: localConfig.instance_name,
              status: data.status || 'close',
              error: undefined,
              exists: true
            }
            console.log('Status processado (fallback):', statusData)
            setInstanceStatus(statusData)
          }
        } catch (parseError) {
          console.error('Erro ao fazer parse da resposta:', parseError)
          console.error('Resposta recebida:', responseText)
          setInstanceStatus({
            instance: localConfig.instance_name,
            status: 'close',
            error: 'Resposta inválida da API. Verifique se a URL está correta.',
            exists: false
          })
        }
      } else if (response.status === 404) {
        // Instância não encontrada
        setInstanceStatus({
          instance: localConfig.instance_name,
          status: 'not_found',
          error: 'Instância não encontrada. Clique em "Criar Instância" para criar.',
          exists: false
        })
      } else {
        const errorText = await response.text()
        console.error('Erro na resposta:', errorText)
        setInstanceStatus({
          instance: localConfig.instance_name,
          status: 'close',
          error: `Falha ao conectar com a API: ${response.status}`,
          exists: false
        })
      }
    } catch (error) {
      console.error('Error checking instance status:', error)
      setInstanceStatus({
        instance: localConfig.instance_name,
        status: 'close',
        error: `Erro de conexão: ${error.message}`
      })
    } finally {
      setCheckingStatus(false)
    }
  }

  const createInstance = async () => {
    if (!localConfig?.evolution_api_url || !localConfig?.evolution_api_key || !localConfig?.instance_name) {
      toast.error('Configure a URL da API, chave e nome da instância primeiro')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`${localConfig.evolution_api_url}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': localConfig.evolution_api_key
        },
        body: JSON.stringify({
          instanceName: localConfig.instance_name,
          webhook: localConfig.webhook_url,
          webhookByEvents: false,
          webhookBase64: false
        })
      })

      if (response.ok) {
        toast.success('Instância criada com sucesso!')
        await checkInstanceStatus()
      } else {
        const error = await response.text()
        toast.error(`Erro ao criar instância: ${error}`)
      }
    } catch (error) {
      console.error('Error creating instance:', error)
      toast.error('Erro ao criar instância')
    } finally {
      setSaving(false)
    }
  }

  const generateQRCode = async () => {
    if (!localConfig?.evolution_api_url || !localConfig?.evolution_api_key || !localConfig?.instance_name) {
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`${localConfig.evolution_api_url}/instance/connect/${localConfig.instance_name}`, {
        method: 'GET',
        headers: {
          'apikey': localConfig.evolution_api_key
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('QR Code gerado:', data)
        
        if (data.base64) {
          setQrCodeData(data.base64)
          setQrModalOpen(true)
          startConnectionMonitoring()
          toast.success('QR Code gerado com sucesso!')
        } else {
          toast.error('QR Code não foi gerado')
        }
      } else {
        const error = await response.text()
        toast.error(`Erro ao gerar QR Code: ${error}`)
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Erro ao gerar QR Code')
    } finally {
      setSaving(false)
    }
  }

  const startConnectionMonitoring = () => {
    // Limpar intervalo anterior se existir
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval)
    }

    // Iniciar verificação a cada 3 segundos
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${localConfig!.evolution_api_url}/instance/connectionState/${localConfig!.instance_name}`, {
          method: 'GET',
          headers: {
            'apikey': localConfig!.evolution_api_key,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Monitoramento de conexão:', data)

          if (data.instance && data.instance.state === 'open') {
            // WhatsApp conectado!
            clearInterval(interval)
            setConnectionCheckInterval(null)
            setQrModalOpen(false)
            setQrCodeData('')
            toast.success('WhatsApp conectado com sucesso!')
            
            // Atualizar status da instância
            setInstanceStatus(prev => ({
              ...prev!,
              status: 'open',
              exists: true
            }))
          }
        }
      } catch (error) {
        console.error('Erro no monitoramento:', error)
      }
    }, 3000) // 3 segundos

    setConnectionCheckInterval(interval)
  }

  const stopConnectionMonitoring = () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval)
      setConnectionCheckInterval(null)
    }
  }

  const disconnectInstance = async () => {
    if (!localConfig?.evolution_api_url || !localConfig?.evolution_api_key || !localConfig?.instance_name) {
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`${localConfig.evolution_api_url}/instance/logout/${localConfig.instance_name}`, {
        method: 'DELETE',
        headers: {
          'apikey': localConfig.evolution_api_key
        }
      })

      if (response.ok) {
        toast.success('Instância desconectada com sucesso!')
        // Atualizar status para 'close'
        setInstanceStatus(prev => ({
          ...prev!,
          status: 'close'
        }))
      } else {
        const error = await response.text()
        toast.error(`Erro ao desconectar instância: ${error}`)
      }
    } catch (error) {
      console.error('Error disconnecting instance:', error)
      toast.error('Erro ao desconectar instância')
    } finally {
      setSaving(false)
    }
  }

  const deleteInstance = async () => {
    if (!localConfig?.evolution_api_url || !localConfig?.evolution_api_key || !localConfig?.instance_name) {
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`${localConfig.evolution_api_url}/instance/delete/${localConfig.instance_name}`, {
        method: 'DELETE',
        headers: {
          'apikey': localConfig.evolution_api_key
        }
      })

      if (response.ok) {
        toast.success('Instância deletada com sucesso!')
        setInstanceStatus(null)
      } else {
        const error = await response.text()
        toast.error(`Erro ao deletar instância: ${error}`)
      }
    } catch (error) {
      console.error('Error deleting instance:', error)
      toast.error('Erro ao deletar instância')
    } finally {
      setSaving(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Wifi className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'qrRead':
        return <QrCode className="h-4 w-4 text-blue-500" />
      case 'qrReadSuccess':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'qrReadError':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'not_found':
        return <XCircle className="h-4 w-4 text-orange-500" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Conectado'
      case 'connecting':
        return 'Conectando... (Clique em Gerar QR Code)'
      case 'qrRead':
        return 'Aguardando QR Code'
      case 'qrReadSuccess':
        return 'QR Code lido com sucesso'
      case 'qrReadError':
        return 'Erro ao ler QR Code'
      case 'not_found':
        return 'Não Encontrada'
      default:
        return 'Desconectado'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Manager</CardTitle>
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
            📱 WhatsApp Manager
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
                <Label className="text-base font-medium">Habilitar WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar integração com WhatsApp via Evolution API
                </p>
              </div>
              <Switch
                checked={localConfig?.enabled || false}
                onCheckedChange={(checked) => updateLocalConfig({ enabled: checked })}
                disabled={saving}
              />
            </div>

            <Separator />

            {/* Configurações da API */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">URL da Evolution API</Label>
                <Input
                  id="api-url"
                  type="url"
                  placeholder="https://sua-evolution-api.com"
                  value={localConfig?.evolution_api_url || ''}
                  onChange={(e) => updateLocalConfig({ evolution_api_url: e.target.value })}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Ex: https://api.evolution.com ou https://sua-evolution-api.com
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Sua API Key"
                  value={localConfig?.evolution_api_key || ''}
                  onChange={(e) => updateLocalConfig({ evolution_api_key: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instance-name">Nome da Instância</Label>
                <Input
                  id="instance-name"
                  placeholder="mya-whatsapp"
                  value={localConfig?.instance_name || ''}
                  onChange={(e) => updateLocalConfig({ instance_name: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL (Opcional)</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://seu-site.com/webhook"
                  value={localConfig?.webhook_url || ''}
                  onChange={(e) => updateLocalConfig({ webhook_url: e.target.value })}
                  disabled={saving}
                />
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
          </div>

          {/* Status da Instância */}
          {localConfig?.enabled && (localConfig?.evolution_api_url && localConfig?.evolution_api_key && localConfig?.instance_name) && (
            <div className="space-y-4">
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Status da Instância</h3>
                  <p className="text-sm text-muted-foreground">
                    Gerencie a conexão do WhatsApp
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkInstanceStatus}
                  disabled={checkingStatus}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              {instanceStatus && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(instanceStatus.status)}
                      <span className="font-medium">{instanceStatus.instance || localConfig?.instance_name}</span>
                    </div>
                    <Badge variant={instanceStatus.status === 'open' ? 'default' : 'secondary'}>
                      {getStatusText(instanceStatus.status)}
                    </Badge>
                  </div>

                  {instanceStatus.error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{instanceStatus.error}</AlertDescription>
                    </Alert>
                  )}



                  <div className="flex gap-2 mt-4">
                    {/* Instância não encontrada - Criar */}
                    {instanceStatus.status === 'not_found' && (
                      <Button onClick={createInstance} disabled={saving}>
                        <Smartphone className="h-4 w-4 mr-2" />
                        Criar Instância
                      </Button>
                    )}
                    
                    {/* Instância existe mas está desconectada ou conectando - Gerar QR Code */}
                    {instanceStatus.exists && (instanceStatus.status === 'close' || instanceStatus.status === 'connecting') && (
                      <div className="flex gap-2">
                        <Button onClick={generateQRCode} disabled={saving}>
                          <QrCode className="h-4 w-4 mr-2" />
                          Gerar QR Code
                        </Button>
                        {instanceStatus.status === 'connecting' && (
                          <Button variant="outline" onClick={disconnectInstance} disabled={saving}>
                            <WifiOff className="h-4 w-4 mr-2" />
                            Desconectar
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Instância conectada - Opções de gerenciamento */}
                    {instanceStatus.status === 'open' && (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={generateQRCode} disabled={saving}>
                          <QrCode className="h-4 w-4 mr-2" />
                          Reconectar
                        </Button>
                        <Button variant="destructive" onClick={deleteInstance} disabled={saving}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Deletar Instância
                        </Button>
                      </div>
                    )}
                    

                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal QR Code */}
      <Dialog open={qrModalOpen} onOpenChange={(open) => {
        if (!open) {
          stopConnectionMonitoring()
          setQrModalOpen(false)
          setQrCodeData('')
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Escaneie o QR Code com seu WhatsApp para conectar
              </p>
              
              {qrCodeData && (
                <div className="flex justify-center">
                  <img 
                    src={qrCodeData} 
                    alt="QR Code WhatsApp" 
                    className="border rounded-lg shadow-lg"
                    style={{ maxWidth: '250px' }}
                  />
                </div>
              )}
              
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  ⏱️ QR Code expira em alguns minutos
                </p>
                <p className="text-xs text-muted-foreground">
                  🔄 Monitorando conexão automaticamente...
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={generateQRCode}
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Gerar Novo QR Code
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  stopConnectionMonitoring()
                  setQrModalOpen(false)
                  setQrCodeData('')
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 