import React, { useState } from 'react';
import { Book, BookLoan, BookLoanStatus, Person, User } from '../../types';
import { StorageService } from '../../services/storage';
import { Search, History, CheckCircle, X, Loader2, ArrowRight, User as UserIcon, Book as BookIcon, Calendar, Clock, Undo2, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Props {
    loans: BookLoan[];
    books: Book[];
    people: Person[];
    onUpdate: () => void;
    user: User;
}

export const BookLoansTab: React.FC<Props> = ({ loans, books, people, onUpdate, user }) => {
    const [activeSubTab, setActiveSubTab] = useState<'current' | 'history'>('current');
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [showPartialReturnModal, setShowPartialReturnModal] = useState(false);
    const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<BookLoan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');

    // New Loan Form State
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [selectedBooks, setSelectedBooks] = useState<{ id: string, title: string, status?: 'Ativo' | 'Devolvido' }[]>([]);
    const [personSearch, setPersonSearch] = useState('');
    const [bookSearch, setBookSearch] = useState('');
    const [observation, setObservation] = useState('');

    const handleAddBook = (book: Book) => {
        if (selectedBooks.find(b => b.id === book.id)) return;
        setSelectedBooks([...selectedBooks, {
            id: book.id,
            title: book.title,
            status: 'Ativo'
        }]);
    };

    const handleRemoveBook = (bookId: string) => {
        setSelectedBooks(selectedBooks.filter(b => b.id !== bookId));
    };

    const handleCreateLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPersonId || selectedBooks.length === 0) {
            alert('Selecione uma pessoa e pelo menos um livro.');
            return;
        }

        const person = people.find(p => p.id === selectedPersonId);
        if (!person) return;

        setIsLoading(true);
        try {
            const newLoan: BookLoan = {
                id: Math.random().toString(36).substr(2, 9),
                personId: person.id,
                personName: person.name,
                books: selectedBooks.map(b => ({ ...b, status: 'Ativo' })),
                loanedBy: user.name,
                loanDate: new Date().toISOString(),
                status: BookLoanStatus.ACTIVE,
                observation,
                history: [{
                    action: `Empréstimo inicial: ${selectedBooks.map(b => b.title).join(', ')}`,
                    user: user.name,
                    timestamp: new Date().toISOString()
                }]
            };

            await StorageService.saveBookLoan(newLoan);
            onUpdate();
            setShowLoanModal(false);
            setSelectedPersonId('');
            setSelectedBooks([]);
            setPersonSearch('');
            setBookSearch('');
            setObservation('');
            alert('Empréstimo realizado com sucesso!');
        } catch (err) {
            alert('Erro ao realizar empréstimo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePartialReturn = async (loan: BookLoan, bookIds: string[]) => {
        if (bookIds.length === 0) return;

        setIsLoading(true);
        try {
            const now = new Date().toISOString();
            const updatedBooks = loan.books.map(b => {
                if (bookIds.includes(b.id)) {
                    return { ...b, status: 'Devolvido' as const, returnDate: now, returnedBy: user.name };
                }
                return b;
            });

            const allReturned = updatedBooks.every(b => b.status === 'Devolvido');
            const returnedTitles = loan.books.filter(b => bookIds.includes(b.id)).map(b => b.title).join(', ');

            const updatedLoan: BookLoan = {
                ...loan,
                books: updatedBooks,
                status: allReturned ? BookLoanStatus.RETURNED : BookLoanStatus.ACTIVE,
                returnDate: allReturned ? now : loan.returnDate,
                history: [
                    ...(loan.history || []),
                    {
                        action: `Devolução parcial: ${returnedTitles}`,
                        user: user.name,
                        timestamp: now
                    }
                ]
            };

            await StorageService.saveBookLoan(updatedLoan);
            onUpdate();
            setShowPartialReturnModal(false);
            alert('Devolução registrada com sucesso!');
        } catch (err) {
            alert('Erro ao processar devolução.');
        } finally {
            setIsLoading(false);
        }
    };

    const normalizeText = (text: string) => {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    const filteredLoans = loans.filter(l => {
        if (!search.trim()) return true;
        const searchTerms = normalizeText(search).split(/\s+/).filter(t => t.length > 0);
        const loanText = normalizeText(`${l.personName} ${l.books.map(b => b.title).join(' ')}`);
        return searchTerms.every(term => loanText.includes(term));
    });

    const activeLoans = filteredLoans.filter(l => l.status === BookLoanStatus.ACTIVE);
    const historicalLoans = filteredLoans.filter(l => l.status === BookLoanStatus.RETURNED);

    const filteredPeople = people.filter(p => {
        if (!personSearch.trim()) return true;
        const searchTerms = normalizeText(personSearch).split(/\s+/).filter(t => t.length > 0);
        const personText = normalizeText(`${p.name} ${p.matricula}`);
        return searchTerms.every(term => personText.includes(term));
    }).slice(0, 5);

    const filteredBooks = books.filter(b => {
        if (!bookSearch.trim()) return true;
        const searchTerms = normalizeText(bookSearch).split(/\s+/).filter(t => t.length > 0);
        const bookText = normalizeText(`${b.title} ${b.code}`);
        return searchTerms.every(term => bookText.includes(term));
    }).slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setActiveSubTab('current')}
                        className={`pb-2 px-4 font-medium text-sm border-b-2 transition-colors ${activeSubTab === 'current' ? 'border-ifrn-green text-ifrn-green' : 'border-transparent text-gray-500'}`}
                    >
                        Empréstimos Ativos ({activeLoans.length})
                    </button>
                    <button
                        onClick={() => setActiveSubTab('history')}
                        className={`pb-2 px-4 font-medium text-sm border-b-2 transition-colors ${activeSubTab === 'history' ? 'border-ifrn-green text-ifrn-green' : 'border-transparent text-gray-500'}`}
                    >
                        Histórico
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por aluno ou livro..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-ifrn-green outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowLoanModal(true)}
                        className="px-4 py-2 bg-ifrn-green text-white rounded-lg hover:bg-ifrn-darkGreen flex items-center gap-2 transition-colors font-medium text-sm"
                    >
                        <ArrowRight size={18} /> Novo Empréstimo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(activeSubTab === 'current' ? activeLoans : historicalLoans).length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                        Nenhum registro encontrado.
                    </div>
                ) : (
                    (activeSubTab === 'current' ? activeLoans : historicalLoans).map(loan => (
                        <div key={loan.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            {loan.status === BookLoanStatus.RETURNED && (
                                <div className="absolute top-3 right-3 text-emerald-600 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <CheckCircle size={12} /> Devolvido
                                </div>
                            )}

                            <div className="flex items-start gap-3 mb-4">
                                <div className={`p-2 rounded-lg ${loan.status === BookLoanStatus.ACTIVE ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}>
                                    <UserIcon size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 leading-tight">{loan.personName}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <Calendar size={12} /> {new Date(loan.loanDate).toLocaleDateString('pt-BR')}
                                        <Clock size={12} /> {new Date(loan.loanDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Livros Emprestados:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {loan.books.map(book => (
                                        <span key={book.id} className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${book.status === 'Devolvido' ? 'bg-green-50 text-green-600 border-green-100 line-through opacity-70' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                            <BookIcon size={12} /> {book.title}
                                            {book.status === 'Devolvido' && <CheckCircle size={10} />}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {loan.observation && (
                                <div className="mt-2 mb-4 p-2.5 bg-gray-50 rounded-lg border border-gray-100 italic text-[11px] text-gray-500 line-clamp-2">
                                    "{loan.observation}"
                                </div>
                            )}

                            <div className="pt-4 border-t border-dashed border-gray-100 flex items-center justify-between">
                                <div className="text-[10px] text-gray-400">
                                    Operador: <span className="font-medium text-gray-600">{loan.loanedBy}</span>
                                </div>
                                {loan.status === BookLoanStatus.ACTIVE && (
                                    <button
                                        onClick={() => {
                                            setSelectedLoanForReturn(loan);
                                            setShowPartialReturnModal(true);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                                    >
                                        <Undo2 size={14} /> Devolver
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={showLoanModal}
                onClose={() => { setShowLoanModal(false); setSelectedPersonId(''); setSelectedBooks([]); }}
                title="Novo Empréstimo de Livros"
            >
                <div className="space-y-6">
                    {/* Person Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">1. Selecionar Aluno/Pessoa</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou matrícula..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-ifrn-green outline-none"
                                value={personSearch}
                                onChange={e => setPersonSearch(e.target.value)}
                            />
                        </div>
                        {personSearch && (
                            <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                {filteredPeople.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setSelectedPersonId(p.id); setPersonSearch(p.name); }}
                                        className={`w-full text-left p-2 rounded text-sm transition-colors ${selectedPersonId === p.id ? 'bg-ifrn-green text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                                    >
                                        <div className="font-bold">{p.name}</div>
                                        <div className={`text-[10px] ${selectedPersonId === p.id ? 'text-green-100' : 'text-gray-400'}`}>{p.matricula} • {p.type}</div>
                                    </button>
                                ))}
                                {filteredPeople.length === 0 && <div className="p-2 text-xs text-center text-gray-400">Nenhum resultado.</div>}
                            </div>
                        )}
                    </div>

                    {/* Book Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">2. Adicionar Livros</label>
                        <div className="relative">
                            <BookIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar livro pelo título ou código..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-ifrn-green outline-none"
                                value={bookSearch}
                                onChange={e => setBookSearch(e.target.value)}
                            />
                        </div>
                        {bookSearch && (
                            <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                {filteredBooks.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => { handleAddBook(b); setBookSearch(''); }}
                                        className="w-full text-left p-2 rounded text-sm hover:bg-gray-200 text-gray-700 transition-colors flex justify-between items-center"
                                    >
                                        <div>
                                            <div className="font-bold">{b.title}</div>
                                            <div className="text-[10px] text-gray-400">{b.code} • {b.series}</div>
                                        </div>
                                        <Plus size={14} className="text-ifrn-green" />
                                    </button>
                                ))}
                                {filteredBooks.length === 0 && <div className="p-2 text-xs text-center text-gray-400">Nenhum resultado.</div>}
                            </div>
                        )}

                        {selectedBooks.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {selectedBooks.map(b => (
                                    <span key={b.id} className="flex items-center gap-1 px-3 py-1 bg-ifrn-green/10 text-ifrn-darkGreen text-xs font-bold rounded-full border border-ifrn-green/20">
                                        {b.title}
                                        <button onClick={() => handleRemoveBook(b.id)} className="hover:text-red-500"><X size={14} /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Observation */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">3. Observação (Opcional)</label>
                        <textarea
                            className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-ifrn-green outline-none h-20 resize-none"
                            placeholder="Adicione observações importantes sobre este empréstimo..."
                            value={observation}
                            onChange={e => setObservation(e.target.value)}
                        />
                    </div>

                    <div className="pt-6 flex justify-end gap-3 border-t">
                        <button
                            type="button"
                            onClick={() => { setShowLoanModal(false); setSelectedPersonId(''); setSelectedBooks([]); }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateLoan}
                            disabled={isLoading || !selectedPersonId || selectedBooks.length === 0}
                            className="px-6 py-2 bg-ifrn-green text-white rounded-lg hover:bg-ifrn-darkGreen font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Finalizar Empréstimo'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Partial Return Modal */}
            <Modal
                isOpen={showPartialReturnModal}
                onClose={() => { setShowPartialReturnModal(false); setSelectedLoanForReturn(null); }}
                title="Confirmar Devolução de Livros"
            >
                {selectedLoanForReturn && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                            <p className="text-sm font-bold text-blue-700">{selectedLoanForReturn.personName}</p>
                            <p className="text-xs text-blue-500 mt-1">Selecione os livros que estão sendo devolvidos agora:</p>
                        </div>

                        <div className="space-y-2">
                            {selectedLoanForReturn.books.map(book => (
                                <div
                                    key={book.id}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${book.status === 'Devolvido' ? 'bg-gray-50 opacity-50 border-gray-200' : 'bg-white border-gray-100 hover:border-ifrn-green cursor-pointer'}`}
                                    onClick={() => {
                                        if (book.status === 'Devolvido') return;
                                        const checkbox = document.getElementById(`book-${book.id}`) as HTMLInputElement;
                                        if (checkbox) checkbox.checked = !checkbox.checked;
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <BookIcon size={18} className={book.status === 'Devolvido' ? 'text-gray-400' : 'text-ifrn-green'} />
                                        <div>
                                            <p className={`text-sm font-bold ${book.status === 'Devolvido' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{book.title}</p>
                                            {book.status === 'Devolvido' && (
                                                <p className="text-[10px] text-green-600 font-bold uppercase">Já devolvido em {new Date(book.returnDate!).toLocaleDateString('pt-BR')}</p>
                                            )}
                                        </div>
                                    </div>
                                    {book.status !== 'Devolvido' && (
                                        <input
                                            type="checkbox"
                                            id={`book-${book.id}`}
                                            className="w-5 h-5 accent-ifrn-green rounded border-gray-300"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 flex justify-end gap-3 border-t">
                            <button
                                onClick={() => { setShowPartialReturnModal(false); setSelectedLoanForReturn(null); }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const selectedBookIds: string[] = [];
                                    selectedLoanForReturn.books.forEach(b => {
                                        const cb = document.getElementById(`book-${b.id}`) as HTMLInputElement;
                                        if (cb && cb.checked) selectedBookIds.push(b.id);
                                    });
                                    if (selectedBookIds.length === 0) {
                                        alert('Selecione pelo menos um livro para devolver.');
                                        return;
                                    }
                                    handlePartialReturn(selectedLoanForReturn, selectedBookIds);
                                }}
                                disabled={isLoading}
                                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar Devolução'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
