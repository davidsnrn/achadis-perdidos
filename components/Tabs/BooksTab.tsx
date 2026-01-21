import React, { useState } from 'react';
import { Book, User } from '../../types';
import { StorageService } from '../../services/storage';
import { Plus, Search, Book as BookIcon, Trash2, Pencil, Loader2, Download, Upload, FileText, CheckCircle, X } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Props {
    books: Book[];
    onUpdate: () => void;
    user: User;
}

export const BooksTab: React.FC<Props> = ({ books, onUpdate, user }) => {
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);

    // Form State
    const [edition, setEdition] = useState('');
    const [code, setCode] = useState('');
    const [area, setArea] = useState('');
    const [title, setTitle] = useState('');
    const [series, setSeries] = useState('');
    const [publisher, setPublisher] = useState('');
    const [quantity, setQuantity] = useState('Indeterminado');

    const resetForm = () => {
        setEdition('');
        setCode('');
        setArea('');
        setTitle('');
        setSeries('');
        setPublisher('');
        setQuantity('Indeterminado');
        setEditingBook(null);
    };

    const handleEdit = (book: Book) => {
        setEditingBook(book);
        setEdition(book.edition);
        setCode(book.code);
        setArea(book.area);
        setTitle(book.title);
        setSeries(book.series);
        setPublisher(book.publisher);
        setQuantity(book.quantity);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await StorageService.saveBook({
                id: editingBook?.id || Math.random().toString(36).substr(2, 9),
                edition,
                code,
                area,
                title,
                series,
                publisher,
                quantity
            });
            onUpdate();
            setShowModal(false);
            resetForm();
            alert('Livro salvo com sucesso!');
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja remover este livro?')) {
            await StorageService.deleteBook(id);
            onUpdate();
        }
    };

    const normalizeText = (text: string) => {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    const filteredBooks = books.filter(b => {
        if (!search.trim()) return true;
        const searchTerms = normalizeText(search).split(/\s+/).filter(t => t.length > 0);
        const bookText = normalizeText(`${b.title} ${b.code} ${b.area}`);
        return searchTerms.every(term => bookText.includes(term));
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-bold text-gray-700 text-lg">Catálogo de Livros ({filteredBooks.length})</h3>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar livro ou código..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-ifrn-green outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="px-4 py-2 bg-ifrn-green text-white rounded-lg hover:bg-ifrn-darkGreen flex items-center gap-2 transition-colors font-medium text-sm"
                    >
                        <Plus size={18} /> Novo Livro
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
                            <tr>
                                <th className="p-4">Edição</th>
                                <th className="p-4">Código</th>
                                <th className="p-4">Área</th>
                                <th className="p-4">Título</th>
                                <th className="p-4">Série</th>
                                <th className="p-4">Editora</th>
                                <th className="p-4">Qtd</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredBooks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">Nenhum livro cadastrado.</td>
                                </tr>
                            ) : (
                                filteredBooks.map(book => (
                                    <tr key={book.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">{book.edition}</td>
                                        <td className="p-4 font-mono text-xs">{book.code}</td>
                                        <td className="p-4">{book.area}</td>
                                        <td className="p-4 font-bold text-gray-800">{book.title}</td>
                                        <td className="p-4">{book.series}</td>
                                        <td className="p-4">{book.publisher}</td>
                                        <td className="p-4 font-medium">{book.quantity}</td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(book)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(book.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingBook ? "Editar Livro" : "Cadastrar Novo Livro"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Edição</label>
                            <input
                                required
                                value={edition}
                                onChange={e => setEdition(e.target.value)}
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green"
                                placeholder="PNLD - 2026..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Código</label>
                            <input
                                required
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green"
                                placeholder="Código único..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Título</label>
                        <input
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green"
                            placeholder="Nome do livro..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Área do Conhecimento</label>
                        <input
                            required
                            value={area}
                            onChange={e => setArea(e.target.value)}
                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green"
                            placeholder="Ex: Matemática, Literatura..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Série/Ano</label>
                            <input
                                required
                                value={series}
                                onChange={e => setSeries(e.target.value)}
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green"
                                placeholder="Ex: 1º ANO..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Editora</label>
                            <input
                                required
                                value={publisher}
                                onChange={e => setPublisher(e.target.value)}
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green"
                                placeholder="Nome da editora..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Quantidade</label>
                        <input
                            required
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ifrn-green"
                            placeholder="Ex: 50 ou Indeterminado"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-ifrn-green text-white rounded-lg hover:bg-ifrn-darkGreen font-bold flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : (editingBook ? 'Atualizar' : 'Salvar')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
