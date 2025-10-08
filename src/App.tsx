import React, { useState, useCallback } from 'react';

interface Config {
  nomeRestaurante: string;
  totalMesas: number;
  pessoasPorMesa: number;
  webhookN8n: string;
  webhookAtivo: boolean;
}

interface FormData {
  nome: string;
  telefone: string;
  email: string;
  data: string;
  horario: string;
  pessoas: number;
}

interface Reserva extends FormData {
  id: number;
  mesasUsadas: number;
  criadoEm: string;
}

const RestaurantBookingApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('reservas');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [renderKey, setRenderKey] = useState<number>(0);
  const [modalCancelar, setModalCancelar] = useState<number | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [successMessageText, setSuccessMessageText] = useState<string>('');
  
  const [config, setConfig] = useState<Config>({
    nomeRestaurante: 'Meu Restaurante',
    totalMesas: 23,
    pessoasPorMesa: 2,
    webhookN8n: '',
    webhookAtivo: false
  });

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    telefone: '',
    email: '',
    data: '',
    horario: '',
    pessoas: 2
  });

  const enviarParaN8n = async (acao: string, dados: any) => {
    if (!config.webhookAtivo || !config.webhookN8n) return;

    try {
      await fetch(config.webhookN8n, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: acao,
          timestamp: new Date().toISOString(),
          dados: dados,
          configuracoes: config
        })
      });
    } catch (error) {
      console.error('Erro n8n:', error);
    }
  };

  const calcularMesasNecessarias = (pessoas: number): number => {
    return Math.ceil(pessoas / config.pessoasPorMesa);
  };

  const verificarDisponibilidade = (data: string, horario: string, pessoas: number) => {
    const mesasNecessarias = calcularMesasNecessarias(pessoas);
    const mesasOcupadas = reservas
      .filter(r => r.data === data && r.horario === horario)
      .reduce((total, r) => total + r.mesasUsadas, 0);
    const mesasDisponiveis = config.totalMesas - mesasOcupadas;
    
    return { disponivel: mesasDisponiveis >= mesasNecessarias, mesasDisponiveis, mesasNecessarias };
  };

  const criarReserva = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    
    if (!formData.nome || !formData.telefone || !formData.email || !formData.data || !formData.horario) {
      setSuccessMessageText('⚠️ Preencha todos os campos!');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      return;
    }
    
    const mesasNecessarias = calcularMesasNecessarias(formData.pessoas);
    const disponibilidade = verificarDisponibilidade(formData.data, formData.horario, formData.pessoas);
    
    if (!disponibilidade.disponivel) {
      setSuccessMessageText(`❌ Sem mesas! Necessário: ${mesasNecessarias} | Disponíveis: ${disponibilidade.mesasDisponiveis}`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 4000);
      return;
    }
    
    const novaReserva: Reserva = {
      id: Date.now(),
      ...formData,
      mesasUsadas: mesasNecessarias,
      criadoEm: new Date().toISOString()
    };

    setReservas([...reservas, novaReserva]);
    await enviarParaN8n('criar_reserva', novaReserva);
    
    setFormData({ nome: '', telefone: '', email: '', data: '', horario: '', pessoas: 2 });
    setSuccessMessageText(`✅ Reserva confirmada! ${mesasNecessarias} mesa(s)`);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleCancelar = useCallback((id: number) => {
    setModalCancelar(id);
  }, []);

  const confirmarCancelamento = async () => {
    if (modalCancelar) {
      const reservaCancelada = reservas.find(r => r.id === modalCancelar);
      setReservas(prev => prev.filter(r => r.id !== modalCancelar));
      setModalCancelar(null);
      await enviarParaN8n('cancelar_reserva', reservaCancelada);
      setSuccessMessageText('Reserva cancelada com sucesso!');
      setShowSuccessMessage(true);
      setRenderKey(k => k + 1);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  };

  const mesasOcupadas = formData.data && formData.horario 
    ? reservas.filter(r => r.data === formData.data && r.horario === formData.horario).reduce((t, r) => t + r.mesasUsadas, 0)
    : 0;
  const mesasDisponiveis = config.totalMesas - mesasOcupadas;
  const mesasNecessarias = calcularMesasNecessarias(formData.pessoas);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #fef3c7, #fed7aa)', padding: '24px' }}>
      {modalCancelar && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '28rem', margin: '0 16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>Cancelar Reserva?</h3>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>As mesas serão liberadas automaticamente.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setModalCancelar(null)} style={{ flex: 1, padding: '12px 24px', backgroundColor: '#e5e7eb', color: '#1f2937', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Não</button>
              <button onClick={confirmarCancelamento} style={{ flex: 1, padding: '12px 24px', backgroundColor: '#dc2626', color: 'white', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Sim, cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showSuccessMessage && (
        <div style={{ position: 'fixed', top: '16px', right: '16px', backgroundColor: '#059669', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 50, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 600 }}>{successMessageText}</span>
        </div>
      )}

      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            🍽️ {config.nomeRestaurante} - Sistema de Reservas
          </h1>
          <p style={{ color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>Gerenciamento inteligente de mesas</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('reservas')} style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'reservas' ? '#ea580c' : 'white', color: activeTab === 'reservas' ? 'white' : '#374151' }}>Nova Reserva</button>
          <button onClick={() => setActiveTab('lista')} style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'lista' ? '#ea580c' : 'white', color: activeTab === 'lista' ? 'white' : '#374151' }}>Reservas ({reservas.length})</button>
          <button onClick={() => setActiveTab('config')} style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'config' ? '#ea580c' : 'white', color: activeTab === 'config' ? 'white' : '#374151' }}>⚙️ Config</button>
        </div>

        {activeTab === 'reservas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Nova Reserva</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} placeholder="Nome" style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <input type="tel" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} placeholder="Telefone" style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email" style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <input type="date" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                  <select value={formData.horario} onChange={(e) => setFormData({...formData, horario: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    <option value="">Horário</option>
                    <option value="18:00">18:00</option>
                    <option value="19:00">19:00</option>
                    <option value="20:00">20:00</option>
                    <option value="21:00">21:00</option>
                    <option value="22:00">22:00</option>
                  </select>
                </div>
                <input type="number" min="1" value={formData.pessoas} onChange={(e) => setFormData({...formData, pessoas: parseInt(e.target.value) || 1})} placeholder="Pessoas" style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <button onClick={criarReserva} style={{ width: '100%', backgroundColor: '#ea580c', color: 'white', padding: '16px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Confirmar Reserva</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Disponibilidade</h3>
                {formData.data && formData.horario ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ backgroundColor: '#dcfce7', border: '2px solid #86efac', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Disponíveis</span>
                        <span style={{ fontSize: '30px', fontWeight: 'bold', color: '#059669' }}>{mesasDisponiveis}</span>
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#fee2e2', border: '2px solid #fca5a5', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Ocupadas</span>
                        <span style={{ fontSize: '30px', fontWeight: 'bold', color: '#dc2626' }}>{mesasOcupadas}</span>
                      </div>
                    </div>
                    {mesasDisponiveis >= mesasNecessarias ? (
                      <div style={{ backgroundColor: '#d1fae5', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ color: '#065f46', fontWeight: 600, margin: 0 }}>✅ Disponível!</p>
                      </div>
                    ) : (
                      <div style={{ backgroundColor: '#fee2e2', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ color: '#991b1b', fontWeight: 600, margin: 0 }}>❌ Sem mesas</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>Selecione data e horário</p>
                )}
              </div>
              <div style={{ background: 'linear-gradient(to bottom right, #f97316, #dc2626)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '24px', color: 'white' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Total de Mesas</h3>
                <p style={{ fontSize: '60px', fontWeight: 'bold', margin: 0 }}>{config.totalMesas}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lista' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Reservas ({reservas.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reservas.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '48px 0' }}>Nenhuma reserva</p>
              ) : (
                reservas.map((r) => (
                  <div key={r.id} style={{ border: '2px solid #e5e7eb', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>{r.nome}</h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>{r.telefone} • {r.email}</p>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0' }}>{r.data} às {r.horario} • {r.pessoas} pessoas • {r.mesasUsadas} mesas</p>
                    </div>
                    <button onClick={() => handleCancelar(r.id)} style={{ padding: '8px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancelar</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>⚙️ Configurações</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '42rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Nome do Restaurante</label>
                <input type="text" value={config.nomeRestaurante} onChange={(e) => setConfig({...config, nomeRestaurante: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Total de Mesas</label>
                <input type="number" min="1" value={config.totalMesas} onChange={(e) => setConfig({...config, totalMesas: parseInt(e.target.value) || 1})} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px' }}>Pessoas por Mesa</label>
                <input type="number" min="1" value={config.pessoasPorMesa} onChange={(e) => setConfig({...config, pessoasPorMesa: parseInt(e.target.value) || 1})} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
              </div>
              
              <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '24px', marginTop: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#581c87' }}>🔗 Integração com n8n</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#faf5ff', padding: '24px', borderRadius: '8px', border: '2px solid #e9d5ff' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '8px', color: '#581c87' }}>Webhook URL</label>
                    <input type="url" value={config.webhookN8n} onChange={(e) => setConfig({...config, webhookN8n: e.target.value})} placeholder="https://seu-n8n.com/webhook/..." style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '2px solid #d8b4fe', fontFamily: 'monospace', fontSize: '14px' }} />
                    <p style={{ fontSize: '14px', color: '#7c3aed', marginTop: '4px' }}>Cole aqui a URL do webhook do seu n8n</p>
                  </div>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '2px solid #d8b4fe', cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.webhookAtivo} onChange={(e) => setConfig({...config, webhookAtivo: e.target.checked})} style={{ width: '20px', height: '20px' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, color: '#1f2937' }}>Ativar Integração n8n</span>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Enviar dados automaticamente para o n8n</p>
                    </div>
                    {config.webhookAtivo && (
                      <span style={{ backgroundColor: '#10b981', color: 'white', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 'bold' }}>ATIVO</span>
                    )}
                  </label>

                  {config.webhookAtivo && config.webhookN8n && (
                    <div style={{ backgroundColor: '#d1fae5', border: '2px solid #86efac', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
                      <p style={{ color: '#065f46', fontWeight: 600, marginBottom: '8px' }}>✅ Integração Ativa!</p>
                      <p style={{ fontSize: '14px', color: '#047857', margin: 0 }}>
                        Todas as reservas serão enviadas para: 
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', display: 'block', marginTop: '4px', backgroundColor: 'white', padding: '8px', borderRadius: '4px' }}>{config.webhookN8n}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantBookingApp;
