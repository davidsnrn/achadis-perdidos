import React, { useState, useMemo } from 'react';
import { Material, MaterialLoan } from '../../types-materiais';
import { Person, User } from '../../types';
import { StorageService } from '../../services/storage';
import { Search, Plus, Edit2, Trash2, Hash, AlertTriangle, Copy, CheckCircle, AlertCircle, Calendar, User as UserIcon, FileText, CornerUpRight, TrendingUp } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Props {
    materials: Material[];
    loans: MaterialLoan[];
    people: Person[];
    user: User;
    onUpdate: () => void;
}

export const MaterialManagementTab: React.FC<Props> = ({ materials, loans, people, user, onUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'RETURNED'>('ALL');

    // Material form
    const [showMaterialForm, setShowMaterialForm] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [formMaterialName, setFormMaterialName] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);

    // Loan form
    const [showLoanForm, setShowLoanForm] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [personSearch, setPersonSearch] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [observation, setObservation] = useState('');

    // Viewing
    const [viewingLoan, setViewingLoan] = useState<MaterialLoan | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

    const stats = useMemo(() => {
        const active = loans.filter(l => l.status === 'ACTIVE').length;
        const returned = loans.filter(l => l.status === 'RETURNED').length;
        return { active, returned, total: loans.length };
    }, [loans]);

    const filteredLoans = useMemo(() => {
        let result = loans;

        if (filterStatus !== 'ALL') {
            result = result.filter(l => l.status === filterStatus);
        }

        if (searchTerm.trim()) {
            // Parse search terms: split by spaces
            const terms = searchTerm.trim().split(/\s+/);

            result = result.filter(loan => {
                // Every term must match
                return terms.every(term => {
                    // Check if term starts with # (code search)
                    if (term.startsWith('#')) {
                        const codeQuery = term.substring(1).toLowerCase();
                        return loan.materialCode.toLowerCase().includes(codeQuery);
                    }

                    // Otherwise, search across all fields
                    const query = term.toLowerCase();
                    return (
                        loan.materialName.toLowerCase().includes(query) ||
                        loan.materialCode.toLowerCase().includes(query) ||
                        loan.personName.toLowerCase().includes(query) ||
                        loan.personMatricula.toLowerCase().includes(query) ||
                        loan.loanDate.includes(query) ||
                        (loan.returnDate && loan.returnDate.includes(query))
                    );
                });
            });
        }

        return result.sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime());
    }, [loans, searchTerm, filterStatus]);

    const filteredPeople = useMemo(() => {
        if (!personSearch.trim()) return [];
        const term = personSearch.toLowerCase();
        return people.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.matricula.toLowerCase().includes(term)
        ).slice(0, 5);
    }, [people, personSearch]);

    const generateCode = (): string => {
        const existingCodes = materials.map(m => m.code);
        let num = 1;
        while (existingCodes.includes(num.toString().padStart(3, '0'))) {
            num++;
        }
        return num.toString().padStart(3, '0');
    };

    const handleMaterialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const code = editingMaterial?.code || generateCode();
        const material: Material = {
            id: editingMaterial?.id || Math.random().toString(36).substr(2, 9),
            code: code,
            name: formMaterialName.trim(),
            createdAt: editingMaterial?.createdAt || new Date().toISOString()
        };

        try {
            await StorageService.saveMaterial(material);
            await onUpdate();
            setShowMaterialForm(false);

            if (!editingMaterial) {
                setGeneratedCode(code);
                setShowSuccessModal(true);
            } else {
                alert('Material atualizado!');
            }
        } catch (error: any) {
            console.error('Erro ao salvar material:', error);
            alert(`Erro ao salvar material: ${error.message || 'Verifique a conexão com o banco de dados.'}`);
        }
    };

    const handleLoanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPerson || !selectedMaterial) {
            alert('Selecione pessoa e material.');
            return;
        }

        const activeLoan = loans.find(l => l.materialId === selectedMaterial.id && l.status === 'ACTIVE');
        if (activeLoan) {
            alert(`Este material já está emprestado para ${activeLoan.personName}.`);
            return;
        }

        const loan: MaterialLoan = {
            id: Math.random().toString(36).substr(2, 9),
            materialId: selectedMaterial.id,
            materialName: selectedMaterial.name,
            materialCode: selectedMaterial.code,
            personId: selectedPerson.id,
            personName: selectedPerson.name,
            personMatricula: selectedPerson.matricula,
            loanDate: new Date().toISOString(),
            observation: observation.trim() || undefined,
            status: 'ACTIVE',
            loanedBy: `${user.name} (${user.matricula})`
        };

        try {
            await StorageService.saveMaterialLoan(loan);
            onUpdate();
            setShowLoanForm(false);
            setSelectedPerson(null);
            setSelectedMaterial(null);
            setObservation('');
            alert('Empréstimo registrado com sucesso!');
        } catch (error) {
            alert('Erro ao registrar empréstimo.');
        }
    };

    const handleReturn = async (loan: MaterialLoan) => {
        if (loan.status === 'RETURNED') return;

        try {
            await StorageService.returnMaterialLoan(loan.id);
            onUpdate();
            setViewingLoan(null);
            alert('Material devolvido com sucesso!');
        } catch (error) {
            alert('Erro ao processar devolução.');
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedCode);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        } catch (error) {
            alert('Erro ao copiar código.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-100 text-sm font-medium">Empréstimos Ativos</p>
                            <p className="text-4xl font-black mt-2">{stats.active}</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <AlertCircle size={32} />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Devolvidos</p>
                            <p className="text-4xl font-black mt-2">{stats.returned}</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <CheckCircle size={32} />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">Total de Materiais</p>
                            <p className="text-4xl font-black mt-2">{materials.length}</p>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <TrendingUp size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Pesquisar (#001, joao, 2025)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => {
                            setEditingMaterial(null);
                            setFormMaterialName('');
                            setShowMaterialForm(true);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <Plus size={18} /> Cadastrar Material
                    </button>
                    <button
                        onClick={() => setShowLoanForm(true)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <Plus size={18} /> Novo Empréstimo
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 justify-center">
                <button
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setFilterStatus('ACTIVE')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === 'ACTIVE' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Ativos
                </button>
                <button
                    onClick={() => setFilterStatus('RETURNED')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === 'RETURNED' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Devolvidos
                </button>
            </div>

            {/* Loans Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
                            <tr>
                                <th className="p-4 text-left">Código</th>
                                <th className="p-4 text-left">Material</th>
                                <th className="p-4 text-left">Pessoa</th>
                                <th className="p-4 text-left">Empréstimo</th>
                                <th className="p-4 text-left">Devolução</th>
                                <th className="p-4 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLoans.map(loan => (
                                <tr key={loan.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewingLoan(loan)}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Hash size={14} className="text-indigo-500" />
                                            <span className="font-mono text-xs font-bold text-indigo-600">{loan.materialCode}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-gray-800">{loan.materialName}</td>
                                    <td className="p-4">
                                        <div>
                                            <p className="text-gray-800 font-medium">{loan.personName}</p>
                                            <p className="text-xs text-gray-500">{loan.personMatricula}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-gray-600">{new Date(loan.loanDate).toLocaleString('pt-BR')}</td>
                                    <td className="p-4 text-xs">{loan.returnDate ? new Date(loan.returnDate).toLocaleString('pt-BR') : <span className="text-amber-600 font-medium">Pendente</span>}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${loan.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                                            {loan.status === 'RETURNED' && <CheckCircle size={10} />}
                                            {loan.status === 'ACTIVE' ? 'ATIVO' : 'DEVOLVIDO'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredLoans.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-400 italic">Nenhum registro encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Material Form Modal */}
            <Modal isOpen={showMaterialForm} onClose={() => setShowMaterialForm(false)} title={editingMaterial ? 'Editar Material' : 'Novo Material'}>
                <form onSubmit={handleMaterialSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Material</label>
                        <input
                            type="text"
                            required
                            value={formMaterialName}
                            onChange={e => setFormMaterialName(e.target.value)}
                            className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 transition-all"
                            placeholder="Ex: Adaptador HDMI"
                        />
                    </div>
                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setShowMaterialForm(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                        <button type="submit" className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Cadastrar</button>
                    </div>
                </form>
            </Modal>

            {/* Success Modal */}
            <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Material Cadastrado!">
                <div className="space-y-6">
                    <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-6 text-center">
                        <p className="text-sm text-indigo-700 font-medium mb-2">CÓDIGO DE RASTREAMENTO</p>
                        <div className="bg-white border-2 border-indigo-400 rounded-lg p-4 mb-4">
                            <p className="text-4xl font-black font-mono text-indigo-900">{generatedCode}</p>
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${copiedCode ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                            {copiedCode ? <><CheckCircle size={20} /> Copiado!</> : <><Copy size={20} /> Copiar Código</>}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Loan Form Modal */}
            <Modal isOpen={showLoanForm} onClose={() => setShowLoanForm(false)} title="Novo Empréstimo">
                <form onSubmit={handleLoanSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pessoa</label>
                        {selectedPerson ? (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-4">
                                <div className="flex-1">
                                    <p className="font-bold text-indigo-900">{selectedPerson.name}</p>
                                    <p className="text-xs text-indigo-700">{selectedPerson.matricula}</p>
                                </div>
                                <button type="button" onClick={() => setSelectedPerson(null)} className="text-xs text-red-500 font-bold underline">Alterar</button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm outline-none focus:border-indigo-500"
                                    placeholder="Buscar pessoa..."
                                    value={personSearch}
                                    onChange={e => setPersonSearch(e.target.value)}
                                />
                                {filteredPeople.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white border rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y">
                                        {filteredPeople.map(p => (
                                            <div key={p.id} onClick={() => { setSelectedPerson(p); setPersonSearch(''); }} className="p-4 hover:bg-indigo-50 cursor-pointer">
                                                <div className="font-bold text-gray-800">{p.name}</div>
                                                <div className="text-xs text-gray-500">{p.matricula}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Material</label>
                        <select
                            required
                            value={selectedMaterial?.id || ''}
                            onChange={e => setSelectedMaterial(materials.find(m => m.id === e.target.value) || null)}
                            className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="">Selecione...</option>
                            {materials.map(m => {
                                const isActive = loans.some(l => l.materialId === m.id && l.status === 'ACTIVE');
                                return <option key={m.id} value={m.id} disabled={isActive}>{m.code} - {m.name} {isActive ? '(Em uso)' : ''}</option>;
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observação</label>
                        <textarea
                            value={observation}
                            onChange={e => setObservation(e.target.value)}
                            className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm outline-none focus:border-indigo-500"
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setShowLoanForm(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                        <button type="submit" className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">Registrar</button>
                    </div>
                </form>
            </Modal>

            {/* Loan Details Modal */}
            <Modal isOpen={!!viewingLoan} onClose={() => setViewingLoan(null)} title="Detalhes do Empréstimo">
                {viewingLoan && (
                    <div className="space-y-4">
                        <div className="bg-indigo-50 p-4 rounded-xl">
                            <p className="text-xs text-indigo-700 uppercase font-bold mb-1">Código</p>
                            <p className="text-2xl font-mono font-black text-indigo-900">{viewingLoan.materialCode}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="col-span-2">
                                <span className="block text-gray-500 text-xs uppercase font-bold">Material</span>
                                <span className="font-bold text-xl text-gray-900">{viewingLoan.materialName}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs uppercase font-bold">Pessoa</span>
                                <p className="font-bold text-gray-800">{viewingLoan.personName}</p>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs uppercase font-bold">Status</span>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${viewingLoan.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                                    {viewingLoan.status === 'ACTIVE' ? 'ATIVO' : 'DEVOLVIDO'}
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button onClick={() => setViewingLoan(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Fechar</button>
                            {viewingLoan.status === 'ACTIVE' && (
                                <button onClick={() => handleReturn(viewingLoan)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center gap-2">
                                    <CornerUpRight size={18} /> Marcar como Devolvido
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
