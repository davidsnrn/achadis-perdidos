import React, { useState } from 'react';
import { User, UserLevel } from '../../types';
import { StorageService } from '../../services/storage';
import { Shield, Plus, Pencil, Trash2, UserCog, Lock } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Props {
  users: User[];
  currentUser: User;
  onUpdate: () => void;
}

export const UsersTab: React.FC<Props> = ({ users, currentUser, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const isAdmin = currentUser.level === UserLevel.ADMIN;

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Se estiver editando, manter a senha antiga se o campo não existir (que foi removido do DOM no modo edição)
    // Se for novo, pegar a senha do form.
    const password = editingUser ? editingUser.password : (formData.get('password') as string);

    const newUser: User = {
      id: editingUser ? editingUser.id : Math.random().toString(36).substr(2, 9),
      matricula: formData.get('matricula') as string,
      name: formData.get('name') as string,
      password: password, 
      level: formData.get('level') as UserLevel,
    };

    StorageService.saveUser(newUser);
    onUpdate();
    setShowModal(false);
    setEditingUser(null);
  };

  const handleResetPassword = () => {
    if (!editingUser) return;
    if (confirm(`Deseja resetar a senha do usuário ${editingUser.name} para 'ifrn123'?`)) {
       const updatedUser = { ...editingUser, password: 'ifrn123' };
       StorageService.saveUser(updatedUser);
       onUpdate();
       alert('Senha resetada com sucesso para: ifrn123');
       setShowModal(false);
       setEditingUser(null);
    }
  };

  const handleDelete = (id: string) => {
    if (id === currentUser.id) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      StorageService.deleteUser(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 flex-1">
          <Shield className="text-amber-600 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-amber-800 text-sm">Controle de Acesso</h4>
            <p className="text-amber-700 text-xs mt-1">
              {isAdmin 
                ? "Como administrador, você tem permissão total para gerenciar usuários e resetar senhas."
                : "Seu nível de acesso permite apenas visualização limitada."}
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-ifrn-green text-white rounded-lg hover:bg-ifrn-darkGreen transition-colors text-sm whitespace-nowrap"
          >
            <Plus size={18} /> Novo Usuário
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
            <tr>
              <th className="p-4">Matrícula (Login)</th>
              <th className="p-4">Nome</th>
              <th className="p-4">Nível de Acesso</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono">{u.matricula}</td>
                <td className="p-4 font-medium flex items-center gap-2">
                   {u.id === currentUser.id && <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Você</span>}
                   {u.name}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    u.level === UserLevel.ADMIN ? 'bg-red-100 text-red-800' : 
                    u.level === UserLevel.ADVANCED ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {u.level}
                  </span>
                </td>
                <td className="p-4">
                  {isAdmin && (
                    <div className="flex justify-center gap-2">
                       <button 
                        onClick={() => { setEditingUser(u); setShowModal(true); }}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                        title="Editar / Resetar Senha"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className={`p-1.5 rounded-md transition-colors ${u.id === currentUser.id ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                        disabled={u.id === currentUser.id}
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                  {!isAdmin && <span className="text-gray-300 text-xs italic text-center block">--</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input 
              name="name" 
              required 
              defaultValue={editingUser?.name} 
              className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green outline-none" 
              placeholder="Nome do servidor..." 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula (Login)</label>
                <input 
                  name="matricula" 
                  required 
                  defaultValue={editingUser?.matricula} 
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green outline-none" 
                />
             </div>
             
             {/* Campo de Senha: Só aparece se for NOVO usuário */}
             {!editingUser && (
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha Inicial</label>
                  <input 
                    name="password" 
                    type="password"
                    required 
                    className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green outline-none" 
                  />
               </div>
             )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Acesso</label>
            <select 
              name="level" 
              defaultValue={editingUser?.level || UserLevel.STANDARD}
              className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-ifrn-green outline-none"
            >
              <option value={UserLevel.STANDARD}>Padrão (Apenas consulta e registro básico)</option>
              <option value={UserLevel.ADVANCED}>Avançado (Gestão de Itens)</option>
              <option value={UserLevel.ADMIN}>Administrador (Acesso Total)</option>
            </select>
          </div>

          {/* Área de Reset de Senha (Só aparece ao EDITAR) */}
          {editingUser && isAdmin && (
            <div className="pt-2 border-t mt-2">
              <label className="block text-xs font-semibold text-gray-500 mb-2">Segurança</label>
              <button 
                type="button" 
                onClick={handleResetPassword}
                className="w-full py-2 border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Lock size={14} /> Resetar Senha para 'ifrn123'
              </button>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t mt-4">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-6 py-2 bg-ifrn-green text-white rounded-lg hover:bg-ifrn-darkGreen font-medium flex items-center gap-2">
              <UserCog size={18} /> Salvar Usuário
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};