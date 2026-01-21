import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Locker, LoanData } from '../../types-armarios';
import { Person, BookLoan, BookLoanStatus } from '../../types';
import { Search, ExternalLink, CheckCircle, AlertTriangle, User, BookOpen, Key, Info, History } from 'lucide-react';

interface NadaConstaTabProps {
    people: Person[];
    lockers: Locker[];
    bookLoans: BookLoan[];
}

export const NadaConstaTab: React.FC<NadaConstaTabProps> = ({
    people,
    lockers,
    bookLoans,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [searchTerm]);

    const students = useMemo(() => {
        return people.map(p => ({
            registration: p.matricula,
            name: p.name,
            course: '',
            situation: 'Matriculado',
            email: ''
        }));
    }, [people]);

    const searchResults = useMemo(() => {
        const rawSearch = searchTerm.trim();
        if (rawSearch.length < 2) return [];

        // Suporte para busca em lote (OU) se contiver vírgula
        if (rawSearch.includes(',')) {
            const searchChunks = rawSearch.split(',')
                .map(chunk => chunk.trim())
                .filter(chunk => chunk.length >= 2);

            if (searchChunks.length === 0) return [];

            return students.filter(s => {
                return searchChunks.some(chunk => {
                    const normalizedChunk = chunk.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                    const studentReg = s.registration.toLowerCase();
                    const studentName = s.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                    // Usamos includes para ambos para permitir busca parcial enquanto digita
                    return studentReg.includes(normalizedChunk) || studentName.includes(normalizedChunk);
                });
            }).slice(0, 50);
        }

        // Busca normal (E) - espaços como separadores
        const searchTerms = rawSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/\s+/).filter(t => t.length > 0);
        return students.filter(s => {
            const studentStr = `${s.registration} ${s.name}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            return searchTerms.every(term => studentStr.includes(term));
        }).slice(0, 20);
    }, [searchTerm, students]);

    const getStudentPendencies = (registration: string) => {
        const activeLockerLoans: LoanData[] = [];
        const activeBookLoans: BookLoan[] = [];

        // Check Lockers
        lockers.forEach(locker => {
            if (locker.currentLoan?.registrationNumber === registration) {
                activeLockerLoans.push(locker.currentLoan);
            }
        });

        // Check Books
        const person = people.find(p => p.matricula === registration);
        if (person) {
            bookLoans.forEach(loan => {
                const hasActiveBooks = loan.books.some(b => b.status === 'Ativo' || !b.status);
                if (loan.personId === person.id && (loan.status === BookLoanStatus.ACTIVE || hasActiveBooks)) {
                    activeBookLoans.push(loan);
                }
            });
        }

        return { activeLockerLoans, activeBookLoans };
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 ring-1 ring-slate-200/50">
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
                        <Search size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Sistema de Nada Consta</h2>
                        <p className="text-slate-500 font-medium italic">Verificação unificada de armários e livros PNLD</p>
                    </div>
                </div>

                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        placeholder="Ex: 202312345, 202398765 ou nomes..."
                        className="w-full bg-slate-50 border-4 border-slate-100 rounded-3xl p-6 text-xl font-black text-slate-800 outline-none focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300 min-h-[100px] overflow-hidden"
                        rows={1}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 ml-4">
                        <Info size={12} /> Dica: Separe por vírgula para buscar vários alunos ao mesmo tempo.
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {searchResults.map(student => {
                    const { activeLockerLoans, activeBookLoans } = getStudentPendencies(student.registration);

                    const realActiveBookLoans = activeBookLoans.filter(loan =>
                        loan.books.some(b => b.status === 'Ativo' || !b.status)
                    );

                    const hasPendency = activeLockerLoans.length > 0 || realActiveBookLoans.length > 0;

                    return (
                        <div key={student.registration} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg overflow-hidden animate-slide-up ring-1 ring-slate-200/50 transition-all hover:shadow-xl hover:translate-y-[-2px]">
                            <div className={`p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b ${hasPendency ? 'bg-red-50/50 border-red-100' : 'bg-green-50/30 border-green-100'}`}>
                                <div className="text-center md:text-left">
                                    <h3 className="text-2xl font-black text-slate-800 uppercase leading-tight">{student.name}</h3>
                                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-6 gap-y-2 mt-2">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Info size={14} className="text-slate-300" />
                                            Matrícula: <span className="text-slate-600">{student.registration}</span>
                                        </span>
                                        <a
                                            href={`https://suap.ifrn.edu.br/edu/aluno/${student.registration}/?tab=nada_consta`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm"
                                        >
                                            <ExternalLink size={12} />
                                            Consultar SUAP
                                        </a>
                                    </div>
                                </div>

                                <div className={`px-10 py-5 rounded-[1.5rem] border-4 flex flex-col items-center justify-center min-w-[260px] transition-all transform hover:scale-105 ${hasPendency ? 'bg-red-600 border-red-100 text-white shadow-xl shadow-red-200' : 'bg-emerald-600 border-emerald-100 text-white shadow-xl shadow-emerald-200'}`}>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Declaração Escolar</span>
                                    <div className="flex items-center gap-2">
                                        {hasPendency ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                                        <span className="text-2xl font-black tracking-tight">{hasPendency ? 'PENDÊNCIA' : 'NADA CONSTA'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Armários Section */}
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <Key size={16} /> Situação de Armários
                                    </h4>
                                    {activeLockerLoans.length > 0 ? (
                                        activeLockerLoans.map(loan => (
                                            <div key={loan.id} className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-black text-red-600 uppercase">Armário #{loan.lockerNumber}</p>
                                                    <p className="text-[10px] text-red-400 font-bold uppercase mt-0.5">Retirado em: {loan.loanDate}</p>
                                                </div>
                                                <div className="bg-red-200 text-red-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Ocupado</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                                            <Key size={32} className="opacity-20 mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Sem pendências</p>
                                        </div>
                                    )}
                                </div>

                                {/* Livros Section */}
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <BookOpen size={16} /> Situação de Livros (PNLD)
                                    </h4>
                                    {realActiveBookLoans.length > 0 ? (
                                        realActiveBookLoans.map(loan => {
                                            const pendingBooks = loan.books.filter(b => b.status === 'Ativo' || !b.status);
                                            return (
                                                <div key={loan.id} className="p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <p className="text-xs font-black text-orange-700 uppercase">Pendente: {pendingBooks.length} de {loan.books.length} Livro(s)</p>
                                                        <div className="bg-orange-200 text-orange-800 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Pendente</div>
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        {loan.books.map(b => (
                                                            <div key={b.id} className={`flex flex-col p-2 rounded-xl border text-[10px] ${b.status === 'Devolvido' ? 'bg-green-50 text-green-600 border-green-100 opacity-50' : 'bg-white/90 border-orange-200 text-orange-900 shadow-sm'}`}>
                                                                <div className="flex items-center justify-between font-black uppercase tracking-tighter">
                                                                    <span>{b.title}</span>
                                                                    {b.status === 'Devolvido' && <CheckCircle size={12} />}
                                                                </div>
                                                                <div className="text-[9px] text-slate-400 mt-0.5 font-bold">
                                                                    CÓD: <span className="text-slate-600 font-black">{b.code || '---'}</span> • SÉRIE: <span className="text-slate-600 font-black">{b.series || '---'}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-[9px] text-orange-400 font-bold uppercase mt-2">Iniciado em: {new Date(loan.loanDate).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                                            <BookOpen size={32} className="opacity-20 mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Sem pendências</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {searchTerm.length >= 2 && searchResults.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <User size={40} className="text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em]">Nenhum aluno encontrado</p>
                        <p className="text-slate-300 text-xs font-bold mt-2">Verifique se a matrícula ou nome estão corretos.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
