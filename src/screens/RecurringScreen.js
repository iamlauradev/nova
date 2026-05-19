import React, { useState } from 'react';
import { notifySuccess, notifyWarning } from '../utils/haptics';
import { useToast } from '../context/ToastContext';
import { useCelebration } from '../context/CelebrationContext';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { COLORS, FREQUENCY_OPTIONS, EMOJI_OPTIONS } from '../theme';
import { parseAmount, formatCurrency } from '../utils';
import GlowCard from '../components/GlowCard';
import SectionHeader from '../components/SectionHeader';
import CategoryImage from '../components/CategoryImage';
import EmojiPicker from '../components/EmojiPicker';

const BLANK = {
  name: '',
  type: 'expense',
  amount: '',
  category: '',
  accountId: '',
  frequency: 'monthly',
  customMonths: '',
  dayOfMonth: '1',
  notes: '',
};

const BLANK_ST = { name: '', fromAccountId: '', toAccountId: '', amount: '', dayOfMonth: '1' };

const BLANK_FI = {
  name: '',
  totalAmount: '',
  months: '',
  monthlyAmount: '',
  accountId: '',
  dayOfMonth: '1',
};

const BLANK_DEBT = {
  name: '',
  totalAmount: '',
  icon: '🏚️',
  color: '#7c3aed',
  notes: '',
  startDate: '',
  targetDate: '',
};

const BLANK_PAY = {
  amount: '',
  accountId: '',
  date: '',
  description: '',
};

const BLANK_LOAN = {
  name: '',
  totalAmount: '',
  icon: '🤝',
  color: '#10b981',
  notes: '',
  startDate: '',
  targetDate: '',
};

const BLANK_COLLECT = {
  amount: '',
  accountId: '',
  date: '',
  description: '',
};

export default function RecurringScreen() {
  const {
    recurringItems, accounts, categories,
    addRecurring, updateRecurring, deleteRecurring, addCategory,
    savingsTransfers, addSavingsTransfer, updateSavingsTransfer, deleteSavingsTransfer,
    savingsAccounts,
    financedItems, addFinancedItem, deleteFinancedItem, applyFinancedItem,
    debts, addDebt, updateDebt, deleteDebt, payDebt,
    loans, addLoan, updateLoan, deleteLoan, collectLoan,
  } = useFinance();

  const { celebrate } = useCelebration();
  const { showToast } = useToast();

  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: '⭐' });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [showStModal, setShowStModal] = useState(false);
  const [stForm, setStForm] = useState(BLANK_ST);
  const [showFiModal, setShowFiModal] = useState(false);
  const [fiForm, setFiForm] = useState(BLANK_FI);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtForm, setDebtForm] = useState(BLANK_DEBT);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanForm, setLoanForm] = useState(BLANK_LOAN);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectTarget, setCollectTarget] = useState(null);
  const [collectForm, setCollectForm] = useState(BLANK_COLLECT);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState(BLANK_PAY);
  const [editingRecurringId, setEditingRecurringId] = useState(null);
  const [editingStId, setEditingStId] = useState(null);
  const [editingFiId, setEditingFiId] = useState(null);
  const [editingDebtId, setEditingDebtId] = useState(null);
  const [editingLoanId, setEditingLoanId] = useState(null);

  const incomeItems = recurringItems.filter(r => r.type === 'income');
  const expenseItems = recurringItems.filter(r => r.type === 'expense');

  const totalFixedIncome = incomeItems.filter(r => r.active).reduce((s, r) => s + r.amount, 0);
  const totalFixedExpense = expenseItems.filter(r => r.active).reduce((s, r) => s + r.amount, 0);

  const handleSaveRecurring = () => {
    if (!form.name.trim()) return Alert.alert('Error', 'Introduce un nombre');
    const amount = parseAmount(form.amount);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Introduce un importe válido (ej: 9,99)');
    const customMonths = form.frequency === 'custom' ? (parseInt(form.customMonths) || 1) : 0;
    if (editingRecurringId) {
      const existing = recurringItems.find(r => r.id === editingRecurringId);
      updateRecurring({ ...existing, ...form, amount, customMonths });
    } else {
      addRecurring({ ...form, amount, customMonths });
      showToast('Compromiso fijo añadido ✓');
    }
    notifySuccess();
    setForm(BLANK);
    setEditingRecurringId(null);
    setShowModal(false);
  };

  const openEditRecurring = (item) => {
    setEditingRecurringId(item.id);
    setForm({
      name: item.name,
      type: item.type,
      amount: String(item.amount),
      category: item.category || '',
      accountId: item.accountId || '',
      frequency: item.frequency || 'monthly',
      customMonths: item.customMonths ? String(item.customMonths) : '',
      dayOfMonth: String(item.dayOfMonth || 1),
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const confirmDelete = (item) => {
    Alert.alert('¿Eliminar?', `Se eliminará "${item.name}" de los compromisos fijos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { notifyWarning(); deleteRecurring(item.id); } },
    ]);
  };

  const toggleActive = (item) => {
    updateRecurring({ ...item, active: !item.active });
  };

  const handleSaveSt = () => {
    if (!stForm.name.trim()) return Alert.alert('Error', 'Introduce un nombre');
    const amount = parseAmount(stForm.amount);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Introduce un importe válido');
    if (!stForm.fromAccountId) return Alert.alert('Error', 'Selecciona la cuenta origen');
    if (!stForm.toAccountId) return Alert.alert('Error', 'Selecciona la cuenta de ahorro destino');
    if (stForm.fromAccountId === stForm.toAccountId) return Alert.alert('Error', 'Las cuentas deben ser distintas');
    const day = parseInt(stForm.dayOfMonth) || 1;
    if (editingStId) {
      const existing = savingsTransfers.find(s => s.id === editingStId);
      updateSavingsTransfer({ ...existing, ...stForm, amount, dayOfMonth: Math.min(30, Math.max(1, day)) });
    } else {
      addSavingsTransfer({ ...stForm, amount, dayOfMonth: Math.min(30, Math.max(1, day)) });
    }
    setEditingStId(null);
    setStForm(BLANK_ST);
    setShowStModal(false);
  };

  const openEditSt = (item) => {
    setEditingStId(item.id);
    setStForm({
      name: item.name,
      fromAccountId: item.fromAccountId,
      toAccountId: item.toAccountId,
      amount: String(item.amount),
      dayOfMonth: String(item.dayOfMonth || 1),
    });
    setShowStModal(true);
  };

  const confirmDeleteSt = (item) => {
    Alert.alert('¿Eliminar?', `Se eliminará la transferencia automática "${item.name}".`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteSavingsTransfer(item.id) },
    ]);
  };

  const handleSaveFi = () => {
    if (!fiForm.name.trim()) return Alert.alert('Error', 'Introduce un nombre');
    const total = parseAmount(fiForm.totalAmount);
    if (!total || total <= 0) return Alert.alert('Error', 'Introduce el importe total');
    const months = parseInt(fiForm.months);
    if (!months || months < 1) return Alert.alert('Error', 'Introduce el número de cuotas');
    if (!fiForm.accountId) return Alert.alert('Error', 'Selecciona una cuenta');
    const monthlyAmount = fiForm.monthlyAmount
      ? parseAmount(fiForm.monthlyAmount)
      : parseFloat((total / months).toFixed(2));
    const day = parseInt(fiForm.dayOfMonth) || 1;
    if (editingFiId) {
      const existing = financedItems.find(f => f.id === editingFiId);
      updateFinancedItem({
        ...existing,
        name: fiForm.name.trim(),
        totalAmount: total,
        months,
        monthlyAmount,
        accountId: fiForm.accountId,
        dayOfMonth: Math.min(30, Math.max(1, day)),
      });
    } else {
      addFinancedItem({
        name: fiForm.name.trim(),
        totalAmount: total,
        months,
        monthlyAmount,
        accountId: fiForm.accountId,
        dayOfMonth: Math.min(30, Math.max(1, day)),
        startDate: new Date().toISOString().split('T')[0],
      });
    }
    notifySuccess();
    setEditingFiId(null);
    setFiForm(BLANK_FI);
    setShowFiModal(false);
  };

  const openEditFi = (item) => {
    setEditingFiId(item.id);
    setFiForm({
      name: item.name,
      totalAmount: String(item.totalAmount),
      months: String(item.months),
      monthlyAmount: String(item.monthlyAmount),
      accountId: item.accountId,
      dayOfMonth: String(item.dayOfMonth || 1),
    });
    setShowFiModal(true);
  };

  const confirmApplyFi = (item) => {
    Alert.alert(
      '¿Aplicar cargo?',
      `Se registrará el cargo ${item.appliedCount + 1}/${item.months} de ${formatCurrency(item.monthlyAmount)} en "${accounts.find(a=>a.id===item.accountId)?.name || 'cuenta'}"`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aplicar', onPress: () => {
            applyFinancedItem(item.id);
            notifySuccess();
            if (item.appliedCount + 1 >= item.months) {
              celebrate('¡Financiado completado!', `"${item.name}" está totalmente pagado 🎉`);
            }
          } },
      ]
    );
  };

  const confirmDeleteFi = (item) => {
    Alert.alert('¿Eliminar?', `Se eliminará "${item.name}". Los cargos ya aplicados permanecerán.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteFinancedItem(item.id) },
    ]);
  };

  // Auto-calculate monthly when total or months changes
  const onFiTotalOrMonthsChange = (field, value) => {
    setFiForm(p => {
      const next = { ...p, [field]: value };
      const total = parseAmount(next.totalAmount);
      const months = parseInt(next.months);
      if (total > 0 && months > 0) {
        next.monthlyAmount = String((total / months).toFixed(2));
      }
      return next;
    });
  };

  const handleSaveDebt = () => {
    if (!debtForm.name.trim()) return Alert.alert('Error', 'Introduce un nombre para la deuda');
    const total = parseAmount(debtForm.totalAmount);
    if (!total || total <= 0) return Alert.alert('Error', 'Introduce el importe total de la deuda');
    const payload = {
      name: debtForm.name.trim(),
      totalAmount: total,
      icon: debtForm.icon,
      color: debtForm.color,
      notes: debtForm.notes,
      startDate: debtForm.startDate || new Date().toISOString().split('T')[0],
      targetDate: debtForm.targetDate,
    };
    if (editingDebtId) {
      updateDebt(editingDebtId, payload);
    } else {
      addDebt(payload);
    }
    notifySuccess();
    setEditingDebtId(null);
    setDebtForm(BLANK_DEBT);
    setShowDebtModal(false);
  };

  const openEditDebt = (item) => {
    setEditingDebtId(item.id);
    setDebtForm({
      name: item.name,
      totalAmount: String(item.totalAmount),
      icon: item.icon || '🏚️',
      color: item.color || '#7c3aed',
      notes: item.notes || '',
      startDate: item.startDate || '',
      targetDate: item.targetDate || '',
    });
    setShowDebtModal(true);
  };

  const handlePayDebt = () => {
    if (!payTarget) return;
    const amount = parseAmount(payForm.amount);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Introduce un importe válido');
    if (!payForm.accountId) return Alert.alert('Error', 'Selecciona la cuenta desde la que pagas');
    const desc = payForm.description.trim() || `Pago deuda: ${payTarget.name}`;
    payDebt(payTarget.id, {
      amount,
      accountId: payForm.accountId,
      date: payForm.date || new Date().toISOString(),
      description: desc,
    });
    showToast('Pago registrado ✓');
    notifySuccess();
    // Check if debt is fully paid
    const paidSoFar = (payTarget.payments || []).reduce((s, p) => s + p.amount, 0) + amount;
    if (paidSoFar >= payTarget.totalAmount) {
      celebrate('¡Deuda saldada!', `"${payTarget.name}" está completamente pagada 🏆`);
    }
    setPayForm(BLANK_PAY);
    setPayTarget(null);
    setShowPayModal(false);
  };

  const openPayModal = (debt) => {
    setPayTarget(debt);
    setPayForm(BLANK_PAY);
    setShowPayModal(true);
  };

  const confirmDeleteDebt = (item) => {
    Alert.alert('¿Eliminar deuda?', `Se eliminará "${item.name}". Los pagos ya registrados permanecerán.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteDebt(item.id) },
    ]);
  };

  const activeDebts = (debts || []).filter(d => d.active === 1 || d.active === true);

  const handleSaveLoan = () => {
    if (!loanForm.name.trim()) return Alert.alert('Error', 'Introduce un nombre para el préstamo');
    const total = parseAmount(loanForm.totalAmount);
    if (!total || total <= 0) return Alert.alert('Error', 'Introduce el importe total prestado');
    const payload = {
      name: loanForm.name.trim(),
      totalAmount: total,
      icon: loanForm.icon,
      color: loanForm.color,
      notes: loanForm.notes,
      startDate: loanForm.startDate || new Date().toISOString().split('T')[0],
      targetDate: loanForm.targetDate,
    };
    if (editingLoanId) {
      updateLoan(editingLoanId, payload);
    } else {
      addLoan(payload);
    }
    notifySuccess();
    setEditingLoanId(null);
    setLoanForm(BLANK_LOAN);
    setShowLoanModal(false);
  };

  const openEditLoan = (item) => {
    setEditingLoanId(item.id);
    setLoanForm({
      name: item.name,
      totalAmount: String(item.totalAmount),
      icon: item.icon || '🤝',
      color: item.color || '#10b981',
      notes: item.notes || '',
      startDate: item.startDate || '',
      targetDate: item.targetDate || '',
    });
    setShowLoanModal(true);
  };

  const handleCollect = () => {
    if (!collectTarget) return;
    const amount = parseAmount(collectForm.amount);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Introduce un importe válido');
    if (!collectForm.accountId) return Alert.alert('Error', 'Selecciona la cuenta donde recibes el dinero');
    const desc = collectForm.description.trim() || `Cobro: ${collectTarget.name}`;
    collectLoan(collectTarget.id, {
      amount,
      accountId: collectForm.accountId,
      date: collectForm.date || new Date().toISOString(),
      description: desc,
    });
    const collectedSoFar = collectTarget.collectedAmount + amount;
    if (collectedSoFar >= collectTarget.totalAmount) {
      celebrate('¡Préstamo cobrado!', `"${collectTarget.name}" está completamente recuperado 🎉`);
    } else {
      showToast('Cobro registrado ✓');
    }
    notifySuccess();
    setCollectForm(BLANK_COLLECT);
    setCollectTarget(null);
    setShowCollectModal(false);
  };

  const openCollectModal = (loan) => {
    setCollectTarget(loan);
    setCollectForm(BLANK_COLLECT);
    setShowCollectModal(true);
  };

  const confirmDeleteLoan = (item) => {
    Alert.alert('¿Eliminar préstamo?', `Se eliminará "${item.name}". Los cobros ya registrados permanecerán.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteLoan(item.id) },
    ]);
  };

  const activeLoans = (loans || []).filter(l => l.active === 1 || l.active === true);

  const currentCats = form.type === 'income' ? categories.income : categories.expense;
  const nonSavingsAccounts = accounts.filter(a => a.type !== 'savings');
  const activeFinancedItems = (financedItems || []).filter(f => f.active !== 0);

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#0d0025', COLORS.bg]} style={styles.header}>
          <Text style={styles.systemLabel}>⟨ COMPROMISOS FIJOS ⟩</Text>
          <View style={styles.summaryRow}>
            <View style={[styles.pill, { borderColor: COLORS.income }]}>
              <Ionicons name="arrow-up" size={12} color={COLORS.income} />
              <Text style={[styles.pillText, { color: COLORS.income }]}>{formatCurrency(totalFixedIncome)}/mes</Text>
            </View>
            <View style={[styles.pill, { borderColor: COLORS.expense }]}>
              <Ionicons name="arrow-down" size={12} color={COLORS.expense} />
              <Text style={[styles.pillText, { color: COLORS.expense }]}>{formatCurrency(totalFixedExpense)}/mes</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Fijos */}
          <SectionHeader
            title="MIS FIJOS"
            right={
              <TouchableOpacity onPress={() => { setForm(BLANK); setShowModal(true); }} style={styles.addBtn}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addBtnText}>AÑADIR</Text>
              </TouchableOpacity>
            }
          />

          {recurringItems.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} onPress={() => setShowModal(true)} activeOpacity={0.8}>
              <Ionicons name="repeat-outline" size={40} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>Sin compromisos fijos</Text>
              <Text style={styles.emptySubtitle}>
                Añade tu nómina, alquiler, suscripciones y otros pagos periódicos
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              {incomeItems.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>INGRESOS FIJOS</Text>
                  {incomeItems.map(item => (
                    <RecurringRow key={item.id} item={item} accounts={accounts} categories={categories} onDelete={confirmDelete} onToggle={toggleActive} onEdit={openEditRecurring} />
                  ))}
                </>
              )}
              {expenseItems.length > 0 && (
                <>
                  <Text style={styles.groupLabel}>GASTOS FIJOS</Text>
                  {expenseItems.map(item => (
                    <RecurringRow key={item.id} item={item} accounts={accounts} categories={categories} onDelete={confirmDelete} onToggle={toggleActive} onEdit={openEditRecurring} />
                  ))}
                </>
              )}
            </>
          )}

          {/* Pagos aplazados */}
          <SectionHeader
            title="PAGOS APLAZADOS"
            right={
              <TouchableOpacity onPress={() => { setFiForm(BLANK_FI); setShowFiModal(true); }} style={styles.addBtn}>
                <Ionicons name="add" size={16} color={COLORS.accent} />
                <Text style={[styles.addBtnText, { color: COLORS.accentLight }]}>AÑADIR</Text>
              </TouchableOpacity>
            }
          />

          {activeFinancedItems.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyState, { borderColor: `${COLORS.accent}44` }]}
              onPress={() => { setFiForm(BLANK_FI); setShowFiModal(true); }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 32 }}>💳</Text>
              <Text style={[styles.emptyTitle, { color: COLORS.accent }]}>Sin pagos aplazados</Text>
              <Text style={styles.emptySubtitle}>
                Registra compras a plazos: TV, móvil, muebles... y controla cuántas cuotas quedan
              </Text>
            </TouchableOpacity>
          ) : (
            activeFinancedItems.map(item => (
              <FinancedItemRow
                key={item.id}
                item={item}
                accounts={accounts}
                onApply={() => confirmApplyFi(item)}
                onDelete={() => confirmDeleteFi(item)}
                onEdit={() => openEditFi(item)}
              />
            ))
          )}

          {/* Deudas */}
          <SectionHeader
            title="DEUDAS"
            right={
              <TouchableOpacity onPress={() => { setDebtForm(BLANK_DEBT); setShowDebtModal(true); }} style={styles.addBtn}>
                <Ionicons name="add" size={16} color="#f43f5e" />
                <Text style={[styles.addBtnText, { color: '#fb7185' }]}>AÑADIR</Text>
              </TouchableOpacity>
            }
          />

          {activeDebts.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyState, { borderColor: 'rgba(244,63,94,0.3)' }]}
              onPress={() => { setDebtForm(BLANK_DEBT); setShowDebtModal(true); }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 32 }}>🏚️</Text>
              <Text style={[styles.emptyTitle, { color: '#f43f5e' }]}>Sin deudas activas</Text>
              <Text style={styles.emptySubtitle}>
                Registra hipotecas, préstamos de coche u otras deudas grandes y sigue tu progreso
              </Text>
            </TouchableOpacity>
          ) : (
            activeDebts.map(item => (
              <DebtRow
                key={item.id}
                item={item}
                onPay={() => openPayModal(item)}
                onDelete={() => confirmDeleteDebt(item)}
                onEdit={() => openEditDebt(item)}
              />
            ))
          )}

          {/* Préstamos */}
          <SectionHeader
            title="PRÉSTAMOS"
            right={
              <TouchableOpacity onPress={() => { setLoanForm(BLANK_LOAN); setShowLoanModal(true); }} style={styles.addBtn}>
                <Ionicons name="add" size={16} color="#10b981" />
                <Text style={[styles.addBtnText, { color: '#34d399' }]}>AÑADIR</Text>
              </TouchableOpacity>
            }
          />

          {activeLoans.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyState, { borderColor: 'rgba(16,185,129,0.3)' }]}
              onPress={() => { setLoanForm(BLANK_LOAN); setShowLoanModal(true); }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 32 }}>🤝</Text>
              <Text style={[styles.emptyTitle, { color: '#10b981' }]}>Sin préstamos activos</Text>
              <Text style={styles.emptySubtitle}>
                Registra dinero que has prestado a amigos o familiares y controla los cobros
              </Text>
            </TouchableOpacity>
          ) : (
            activeLoans.map(item => (
              <LoanRow
                key={item.id}
                item={item}
                onCollect={() => openCollectModal(item)}
                onDelete={() => confirmDeleteLoan(item)}
                onEdit={() => openEditLoan(item)}
              />
            ))
          )}

          {/* Ahorro automático */}
          <SectionHeader
            title="AHORRO AUTOMÁTICO"
            right={
              savingsAccounts.length > 0 ? (
                <TouchableOpacity onPress={() => { setStForm(BLANK_ST); setShowStModal(true); }} style={styles.addBtn}>
                  <Ionicons name="add" size={16} color={COLORS.gold} />
                  <Text style={[styles.addBtnText, { color: COLORS.goldLight }]}>AÑADIR</Text>
                </TouchableOpacity>
              ) : null
            }
          />

          {savingsAccounts.length === 0 ? (
            <GlowCard>
              <Text style={styles.stEmptyText}>
                🏦 Crea una cuenta de tipo "Ahorro" para activar las transferencias automáticas
              </Text>
            </GlowCard>
          ) : savingsTransfers.length === 0 ? (
            <TouchableOpacity style={[styles.emptyState, { borderColor: `${COLORS.gold}44` }]} onPress={() => { setStForm(BLANK_ST); setShowStModal(true); }} activeOpacity={0.8}>
              <Text style={{ fontSize: 32 }}>🏦</Text>
              <Text style={[styles.emptyTitle, { color: COLORS.gold }]}>Sin ahorro automático</Text>
              <Text style={styles.emptySubtitle}>
                Configura transferencias mensuales automáticas hacia tus cuentas de ahorro
              </Text>
            </TouchableOpacity>
          ) : (
            savingsTransfers.map(item => (
              <SavingsTransferRow
                key={item.id}
                item={item}
                accounts={accounts}
                onDelete={confirmDeleteSt}
                onToggle={(it) => updateSavingsTransfer({ ...it, active: !it.active })}
                onEdit={openEditSt}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal Fijo */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>{editingRecurringId ? '[ EDITAR FIJO ]' : '[ NUEVO FIJO ]'}</Text>

            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[styles.typeBtn, form.type === 'income' && { backgroundColor: COLORS.incomeGlow, borderColor: COLORS.income }]}
                onPress={() => setForm(p => ({ ...p, type: 'income', category: '' }))}
              >
                <Ionicons name="arrow-up-circle" size={16} color={form.type === 'income' ? COLORS.income : COLORS.textDim} />
                <Text style={[styles.typeBtnText, form.type === 'income' && { color: COLORS.income }]}>INGRESO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, form.type === 'expense' && { backgroundColor: COLORS.expenseGlow, borderColor: COLORS.expense }]}
                onPress={() => setForm(p => ({ ...p, type: 'expense', category: '' }))}
              >
                <Ionicons name="arrow-down-circle" size={16} color={form.type === 'expense' ? COLORS.expense : COLORS.textDim} />
                <Text style={[styles.typeBtnText, form.type === 'expense' && { color: COLORS.expense }]}>GASTO</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>NOMBRE</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Nómina, Netflix, Alquiler..."
              placeholderTextColor={COLORS.textDim}
              value={form.name}
              onChangeText={v => setForm(p => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>IMPORTE (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={v => setForm(p => ({ ...p, amount: v }))}
            />

            <Text style={styles.fieldLabel}>FRECUENCIA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FREQUENCY_OPTIONS.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.chipBtn, form.frequency === f.id && { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary }]}
                    onPress={() => setForm(p => ({ ...p, frequency: f.id, customMonths: '' }))}
                  >
                    <Text style={[styles.chipText, form.frequency === f.id && { color: COLORS.primaryLight }]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {form.frequency === 'custom' && (
              <>
                <Text style={styles.fieldLabel}>CADA CUÁNTOS MESES</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 3 (cada trimestre), 6 (semestral)..."
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                  value={form.customMonths}
                  onChangeText={v => setForm(p => ({ ...p, customMonths: v }))}
                />
              </>
            )}

            {(form.frequency === 'monthly' || form.frequency === 'quarterly' || form.frequency === 'yearly' || form.frequency === 'custom') && (
              <>
                <Text style={styles.fieldLabel}>DÍA DEL MES</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1-31"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numeric"
                  value={form.dayOfMonth}
                  onChangeText={v => setForm(p => ({ ...p, dayOfMonth: v }))}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>CUENTA ASOCIADA (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.chipBtn, form.accountId === '' && { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary }]}
                  onPress={() => setForm(p => ({ ...p, accountId: '' }))}
                >
                  <Text style={styles.chipText}>Ninguna</Text>
                </TouchableOpacity>
                {accounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chipBtn, form.accountId === a.id && { backgroundColor: `${a.color}33`, borderColor: a.color }]}
                    onPress={() => setForm(p => ({ ...p, accountId: a.id }))}
                  >
                    <Text style={styles.chipText}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>CATEGORÍA (opcional)</Text>
              <TouchableOpacity onPress={() => setShowCatModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="add-circle-outline" size={14} color={COLORS.primaryLight} />
                <Text style={{ color: COLORS.primaryLight, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>NUEVA</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.catGrid}>
              {currentCats.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catChip,
                    form.category === c.id && {
                      backgroundColor: form.type === 'income' ? COLORS.incomeGlow : COLORS.expenseGlow,
                      borderColor: form.type === 'income' ? COLORS.income : COLORS.expense,
                    },
                  ]}
                  onPress={() => setForm(p => ({ ...p, category: p.category === c.id ? '' : c.id }))}
                >
                  <CategoryImage image={c.image} icon={c.icon} size={18} />
                  <Text style={styles.catName}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.modalActions, { marginTop: 24, marginBottom: 48 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowModal(false); setForm(BLANK); setEditingRecurringId(null); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSaveRecurring}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Pago Aplazado */}
      <Modal visible={showFiModal} animationType="slide" transparent onRequestClose={() => setShowFiModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: COLORS.accent }]}>{editingFiId ? '[ EDITAR APLAZADO ]' : '[ PAGO APLAZADO ]'}</Text>

            <Text style={styles.fieldLabel}>NOMBRE</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. iPhone 16, Sofá IKEA..."
              placeholderTextColor={COLORS.textDim}
              value={fiForm.name}
              onChangeText={v => setFiForm(p => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>IMPORTE TOTAL (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={fiForm.totalAmount}
              onChangeText={v => onFiTotalOrMonthsChange('totalAmount', v)}
            />

            <Text style={styles.fieldLabel}>NÚMERO DE CUOTAS</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 12"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
              value={fiForm.months}
              onChangeText={v => onFiTotalOrMonthsChange('months', v)}
            />

            <Text style={styles.fieldLabel}>IMPORTE POR CUOTA (€) — calculado automáticamente</Text>
            <TextInput
              style={[styles.input, { color: COLORS.accent }]}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={fiForm.monthlyAmount}
              onChangeText={v => setFiForm(p => ({ ...p, monthlyAmount: v }))}
            />

            <Text style={styles.fieldLabel}>DÍA DEL CARGO (1-30)</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
              value={fiForm.dayOfMonth}
              onChangeText={v => setFiForm(p => ({ ...p, dayOfMonth: v }))}
            />

            <Text style={styles.fieldLabel}>CUENTA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {accounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chipBtn, fiForm.accountId === a.id && { backgroundColor: `${a.color}33`, borderColor: a.color }]}
                    onPress={() => setFiForm(p => ({ ...p, accountId: a.id }))}
                  >
                    <Text style={styles.chipText}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { marginBottom: 48 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowFiModal(false); setFiForm(BLANK_FI); setEditingFiId(null); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSaveFi}>
                <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Ahorro Automático */}
      <Modal visible={showStModal} animationType="slide" transparent onRequestClose={() => setShowStModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: COLORS.gold }]}>{editingStId ? '[ EDITAR AHORRO ]' : '[ AHORRO AUTOMÁTICO ]'}</Text>

            <Text style={styles.fieldLabel}>NOMBRE</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Ahorro mensual"
              placeholderTextColor={COLORS.textDim}
              value={stForm.name}
              onChangeText={v => setStForm(p => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>IMPORTE (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={stForm.amount}
              onChangeText={v => setStForm(p => ({ ...p, amount: v }))}
            />

            <Text style={styles.fieldLabel}>DÍA DEL MES (1-30)</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
              value={stForm.dayOfMonth}
              onChangeText={v => setStForm(p => ({ ...p, dayOfMonth: v }))}
            />

            <Text style={styles.fieldLabel}>CUENTA ORIGEN (de dónde sale)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {nonSavingsAccounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chipBtn, stForm.fromAccountId === a.id && { backgroundColor: `${a.color}33`, borderColor: a.color }]}
                    onPress={() => setStForm(p => ({ ...p, fromAccountId: a.id }))}
                  >
                    <Text style={styles.chipText}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>CUENTA DESTINO (ahorro)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {savingsAccounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chipBtn, stForm.toAccountId === a.id && { backgroundColor: `${COLORS.gold}22`, borderColor: COLORS.gold }]}
                    onPress={() => setStForm(p => ({ ...p, toAccountId: a.id }))}
                  >
                    <Text style={styles.chipText}>🏦 {a.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 8, marginBottom: 48 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowStModal(false); setStForm(BLANK_ST); setEditingStId(null); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSaveSt}>
                <LinearGradient colors={[COLORS.gold, '#b45309']} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Nueva Deuda */}
      <Modal visible={showDebtModal} animationType="slide" transparent onRequestClose={() => setShowDebtModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: '#f43f5e' }]}>{editingDebtId ? '[ EDITAR DEUDA ]' : '[ NUEVA DEUDA ]'}</Text>

            <Text style={styles.fieldLabel}>NOMBRE</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Hipoteca, Préstamo coche..."
              placeholderTextColor={COLORS.textDim}
              value={debtForm.name}
              onChangeText={v => setDebtForm(p => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>IMPORTE TOTAL ADEUDADO (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={debtForm.totalAmount}
              onChangeText={v => setDebtForm(p => ({ ...p, totalAmount: v }))}
            />

            <Text style={styles.fieldLabel}>ICONO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['🏚️','🚗','💳','🏦','📋','🔑','⚓','🏋️','💊','📱'].map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, debtForm.icon === e && styles.emojiBtnSelected]}
                    onPress={() => setDebtForm(p => ({ ...p, icon: e }))}
                  >
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>NOTAS (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Banco, condiciones, referencia..."
              placeholderTextColor={COLORS.textDim}
              value={debtForm.notes}
              onChangeText={v => setDebtForm(p => ({ ...p, notes: v }))}
            />

            <Text style={styles.fieldLabel}>FECHA OBJETIVO (opcional, DD/MM/AAAA)</Text>
            <TextInput
              style={styles.input}
              placeholder="31/12/2030"
              placeholderTextColor={COLORS.textDim}
              value={debtForm.targetDate}
              onChangeText={v => setDebtForm(p => ({ ...p, targetDate: v }))}
            />

            <View style={[styles.modalActions, { marginTop: 8, marginBottom: 48 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowDebtModal(false); setDebtForm(BLANK_DEBT); setEditingDebtId(null); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSaveDebt}>
                <LinearGradient colors={['#f43f5e', '#be123c']} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Registrar Pago Deuda */}
      <Modal visible={showPayModal} animationType="slide" transparent onRequestClose={() => setShowPayModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: '#f43f5e' }]}>[ REGISTRAR PAGO ]</Text>
            {payTarget && (
              <View style={styles.debtPayInfo}>
                <Text style={{ fontSize: 24 }}>{payTarget.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.debtPayName}>{payTarget.name}</Text>
                  <Text style={styles.debtPayMeta}>
                    Pagado: {formatCurrency(payTarget.paidAmount)} / {formatCurrency(payTarget.totalAmount)}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>IMPORTE A PAGAR (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={payForm.amount}
              onChangeText={v => setPayForm(p => ({ ...p, amount: v }))}
            />

            <Text style={styles.fieldLabel}>CUENTA DESDE LA QUE PAGAS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {accounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chipBtn, payForm.accountId === a.id && { backgroundColor: `${a.color}33`, borderColor: a.color }]}
                    onPress={() => setPayForm(p => ({ ...p, accountId: a.id }))}
                  >
                    <Text style={styles.chipText}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>DESCRIPCIÓN (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder={`Pago ${payTarget?.name || 'deuda'}...`}
              placeholderTextColor={COLORS.textDim}
              value={payForm.description}
              onChangeText={v => setPayForm(p => ({ ...p, description: v }))}
            />

            <View style={[styles.modalActions, { marginTop: 8, marginBottom: 48 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowPayModal(false); setPayTarget(null); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handlePayDebt}>
                <LinearGradient colors={['#f43f5e', '#be123c']} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>PAGAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Nuevo Préstamo */}
      <Modal visible={showLoanModal} animationType="slide" transparent onRequestClose={() => setShowLoanModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: '#10b981' }]}>{editingLoanId ? '[ EDITAR PRÉSTAMO ]' : '[ NUEVO PRÉSTAMO ]'}</Text>

            <Text style={styles.fieldLabel}>NOMBRE / PERSONA</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Préstamo a Juan, Amigo..."
              placeholderTextColor={COLORS.textDim}
              value={loanForm.name}
              onChangeText={v => setLoanForm(p => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>IMPORTE TOTAL PRESTADO (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={loanForm.totalAmount}
              onChangeText={v => setLoanForm(p => ({ ...p, totalAmount: v }))}
            />

            <Text style={styles.fieldLabel}>ICONO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['🤝','👤','👫','💸','📋','🏦','💰','📱','🚗','🏠'].map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, loanForm.icon === e && styles.emojiBtnSelected]}
                    onPress={() => setLoanForm(p => ({ ...p, icon: e }))}
                  >
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>NOTAS (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Motivo, condiciones..."
              placeholderTextColor={COLORS.textDim}
              value={loanForm.notes}
              onChangeText={v => setLoanForm(p => ({ ...p, notes: v }))}
            />

            <Text style={styles.fieldLabel}>FECHA LÍMITE (opcional, DD/MM/AAAA)</Text>
            <TextInput
              style={styles.input}
              placeholder="31/12/2025"
              placeholderTextColor={COLORS.textDim}
              value={loanForm.targetDate}
              onChangeText={v => setLoanForm(p => ({ ...p, targetDate: v }))}
            />

            <View style={[styles.modalActions, { marginTop: 8, marginBottom: 48 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowLoanModal(false); setLoanForm(BLANK_LOAN); setEditingLoanId(null); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSaveLoan}>
                <LinearGradient colors={['#10b981', '#059669']} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Registrar Cobro Préstamo */}
      <Modal visible={showCollectModal} animationType="slide" transparent onRequestClose={() => setShowCollectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: '#10b981' }]}>[ REGISTRAR COBRO ]</Text>
            {collectTarget && (
              <View style={styles.debtPayInfo}>
                <Text style={{ fontSize: 24 }}>{collectTarget.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.debtPayName}>{collectTarget.name}</Text>
                  <Text style={styles.debtPayMeta}>
                    Cobrado: {formatCurrency(collectTarget.collectedAmount)} / {formatCurrency(collectTarget.totalAmount)}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>IMPORTE COBRADO (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={collectForm.amount}
              onChangeText={v => setCollectForm(p => ({ ...p, amount: v }))}
            />

            <Text style={styles.fieldLabel}>CUENTA DONDE RECIBES EL DINERO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {accounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chipBtn, collectForm.accountId === a.id && { backgroundColor: `${a.color}33`, borderColor: a.color }]}
                    onPress={() => setCollectForm(p => ({ ...p, accountId: a.id }))}
                  >
                    <Text style={styles.chipText}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>DESCRIPCIÓN (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Devolución parcial..."
              placeholderTextColor={COLORS.textDim}
              value={collectForm.description}
              onChangeText={v => setCollectForm(p => ({ ...p, description: v }))}
            />

            <View style={[styles.modalActions, { marginTop: 8, marginBottom: 48 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowCollectModal(false); setCollectTarget(null); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleCollect}>
                <LinearGradient colors={['#10b981', '#059669']} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>COBRAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Nueva Categoría */}
      <Modal visible={showCatModal} animationType="slide" transparent onRequestClose={() => setShowCatModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { height: '88%', flexDirection: 'column' }]}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>[ NUEVA CATEGORÍA ]</Text>
            <Text style={styles.fieldLabel}>NOMBRE</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Veterinario"
              placeholderTextColor={COLORS.textDim}
              value={newCat.name}
              onChangeText={v => setNewCat(p => ({ ...p, name: v }))}
            />
            <Text style={styles.fieldLabel}>EMOJI</Text>
            <View style={{ flex: 1 }}>
              <EmojiPicker
                selected={newCat.icon}
                onSelect={emoji => setNewCat(p => ({ ...p, icon: emoji }))}
              />
            </View>
            <View style={[styles.modalActions, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowCatModal(false); setNewCat({ name: '', icon: '⭐' }); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={async () => {
                if (!newCat.name.trim()) return Alert.alert('Error', 'Introduce un nombre');
                await addCategory(form.type === 'income' ? 'income' : 'expense', { name: newCat.name.trim(), icon: newCat.icon });
                setNewCat({ name: '', icon: '⭐' });
                setShowCatModal(false);
              }}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


function LoanRow({ item, onCollect, onDelete, onEdit }) {
  const total = item.totalAmount || 0;
  const collected = item.collectedAmount || 0;
  const progress = total > 0 ? Math.min(collected / total, 1) : 0;
  const remaining = total - collected;

  return (
    <GlowCard style={styles.recCard} color="rgba(16,185,129,0.12)">
      <View style={styles.recHeader}>
        <View style={[styles.recIcon, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' }]}>
          <Text style={{ fontSize: 18 }}>{item.icon || '🤝'}</Text>
        </View>
        <View style={styles.recInfo}>
          <Text style={styles.recName}>{item.name}</Text>
          <Text style={styles.recMeta}>
            {item.notes ? item.notes : 'Préstamo pendiente'}
            {item.targetDate ? ` · 🗓️ ${item.targetDate}` : ''}
          </Text>
        </View>
        <View style={styles.recRight}>
          <Text style={[styles.recAmount, { color: '#10b981' }]}>
            +{formatCurrency(remaining)}
          </Text>
          <Text style={{ color: '#34d399', fontSize: 9, fontWeight: '700' }}>
            {Math.round(progress * 100)}% cobrado
          </Text>
        </View>
      </View>

      <View style={[styles.progressBg, { marginTop: 12 }]}>
        <LinearGradient
          colors={progress >= 1 ? [COLORS.income, `${COLORS.income}88`] : ['#10b981', '#059669']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
        />
      </View>

      <View style={styles.fiFooter}>
        <Text style={styles.fiMeta}>
          {formatCurrency(collected)} cobrado de {formatCurrency(total)}
        </Text>
        <View style={styles.fiActions}>
          {progress < 1 && (
            <TouchableOpacity style={[styles.applyBtn, { borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.1)' }]} onPress={onCollect}>
              <Ionicons name="cash-outline" size={10} color="#10b981" />
              <Text style={[styles.applyBtnText, { color: '#10b981' }]}>COBRAR</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onEdit}>
            <Ionicons name="pencil-outline" size={14} color={COLORS.textDim} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete}>
            <Ionicons name="trash-outline" size={14} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>
      </View>
    </GlowCard>
  );
}

function DebtRow({ item, onPay, onDelete, onEdit }) {
  const total = item.totalAmount || 0;
  const paid = item.paidAmount || 0;
  const progress = total > 0 ? Math.min(paid / total, 1) : 0;
  const remaining = total - paid;

  return (
    <GlowCard style={styles.recCard} color="rgba(244,63,94,0.12)">
      <View style={styles.recHeader}>
        <View style={[styles.recIcon, { backgroundColor: 'rgba(244,63,94,0.15)', borderColor: '#f43f5e' }]}>
          <Text style={{ fontSize: 18 }}>{item.icon || '🏚️'}</Text>
        </View>
        <View style={styles.recInfo}>
          <Text style={styles.recName}>{item.name}</Text>
          <Text style={styles.recMeta}>
            {item.notes ? item.notes : 'Deuda a largo plazo'}
            {item.targetDate ? ` · 🗓️ ${item.targetDate}` : ''}
          </Text>
        </View>
        <View style={styles.recRight}>
          <Text style={[styles.recAmount, { color: '#f43f5e' }]}>
            -{formatCurrency(remaining)}
          </Text>
          <Text style={{ color: '#fb7185', fontSize: 9, fontWeight: '700' }}>
            {Math.round(progress * 100)}% pagado
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBg, { marginTop: 12 }]}>
        <LinearGradient
          colors={progress >= 1 ? [COLORS.income, `${COLORS.income}88`] : ['#f43f5e', '#be123c']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
        />
      </View>

      <View style={styles.fiFooter}>
        <Text style={styles.fiMeta}>
          {formatCurrency(paid)} pagado de {formatCurrency(total)}
        </Text>
        <View style={styles.fiActions}>
          {progress < 1 && (
            <TouchableOpacity style={[styles.applyBtn, { borderColor: 'rgba(244,63,94,0.5)', backgroundColor: 'rgba(244,63,94,0.1)' }]} onPress={onPay}>
              <Ionicons name="card-outline" size={10} color="#f43f5e" />
              <Text style={[styles.applyBtnText, { color: '#f43f5e' }]}>PAGAR</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onEdit}>
            <Ionicons name="pencil-outline" size={14} color={COLORS.textDim} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete}>
            <Ionicons name="trash-outline" size={14} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>
      </View>
    </GlowCard>
  );
}

function FinancedItemRow({ item, accounts, onApply, onDelete, onEdit }) {
  const account = accounts.find(a => a.id === item.accountId);
  const progress = item.months > 0 ? item.appliedCount / item.months : 0;
  const remaining = item.months - item.appliedCount;
  const isDone = item.appliedCount >= item.months;

  return (
    <GlowCard style={[styles.recCard, isDone && { opacity: 0.6 }]} color={`${COLORS.accent}22`}>
      <View style={styles.recHeader}>
        <View style={[styles.recIcon, { backgroundColor: `${COLORS.accent}22`, borderColor: COLORS.accent }]}>
          <Text style={{ fontSize: 18 }}>💳</Text>
        </View>
        <View style={styles.recInfo}>
          <Text style={styles.recName}>{item.name}</Text>
          <Text style={styles.recMeta}>
            {account?.name || '?'} · Día {item.dayOfMonth}
          </Text>
        </View>
        <View style={styles.recRight}>
          <View style={[
            styles.cargoBadge,
            isDone
              ? { backgroundColor: `${COLORS.income}22`, borderColor: COLORS.income }
              : { backgroundColor: `${COLORS.accent}22`, borderColor: COLORS.accent },
          ]}>
            <Text style={[styles.cargoBadgeText, { color: isDone ? COLORS.income : COLORS.accent }]}>
              {isDone ? '✓ PAGADO' : `Cargo ${item.appliedCount}/${item.months}`}
            </Text>
          </View>
          <Text style={[styles.recAmount, { color: COLORS.accent }]}>
            {formatCurrency(item.monthlyAmount)}/mes
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <LinearGradient
          colors={isDone ? [COLORS.income, `${COLORS.income}88`] : [COLORS.accent, `${COLORS.accent}66`]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]}
        />
      </View>
      <View style={styles.fiFooter}>
        <Text style={styles.fiMeta}>
          {formatCurrency(item.totalAmount)} total · {remaining > 0 ? `${remaining} cuotas restantes` : '¡Completado!'}
        </Text>
        <View style={styles.fiActions}>
          {!isDone && (
            <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
              <Ionicons name="flash" size={10} color={COLORS.accent} />
              <Text style={styles.applyBtnText}>APLICAR</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onEdit}>
            <Ionicons name="pencil-outline" size={14} color={COLORS.textDim} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete}>
            <Ionicons name="trash-outline" size={14} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>
      </View>
    </GlowCard>
  );
}

function SavingsTransferRow({ item, accounts, onDelete, onToggle, onEdit }) {
  const fromAcc = accounts.find(a => a.id === item.fromAccountId);
  const toAcc = accounts.find(a => a.id === item.toAccountId);

  return (
    <GlowCard style={[styles.recCard, !item.active && styles.recCardInactive]} color={`${COLORS.gold}22`}>
      <View style={styles.recHeader}>
        <View style={[styles.recIcon, { backgroundColor: `${COLORS.gold}22`, borderColor: COLORS.gold }]}>
          <Text style={{ fontSize: 18 }}>🏦</Text>
        </View>
        <View style={styles.recInfo}>
          <Text style={[styles.recName, !item.active && { opacity: 0.5 }]}>{item.name}</Text>
          <Text style={styles.recMeta}>
            Día {item.dayOfMonth} · {fromAcc?.name || '?'} → {toAcc?.name || '?'}
          </Text>
        </View>
        <View style={styles.recRight}>
          <Text style={[styles.recAmount, { color: COLORS.gold, opacity: item.active ? 1 : 0.4 }]}>
            {formatCurrency(item.amount)}
          </Text>
          <View style={styles.recActions}>
            <Switch
              value={!!item.active}
              onValueChange={() => onToggle(item)}
              trackColor={{ false: COLORS.bgCardLight, true: `${COLORS.gold}88` }}
              thumbColor={item.active ? COLORS.gold : COLORS.textDim}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
            <TouchableOpacity onPress={() => onEdit(item)}>
              <Ionicons name="pencil-outline" size={14} color={COLORS.textDim} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item)}>
              <Ionicons name="trash-outline" size={14} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </GlowCard>
  );
}

function RecurringRow({ item, accounts, categories, onDelete, onToggle, onEdit }) {
  const isIncome = item.type === 'income';
  const cats = isIncome ? categories.income : categories.expense;
  const cat = cats.find(c => c.id === item.category);
  const account = accounts.find(a => a.id === item.accountId);
  const freq = FREQUENCY_OPTIONS.find(f => f.id === item.frequency);
  const freqLabel = item.frequency === 'custom' && item.customMonths > 0
    ? `Cada ${item.customMonths} meses`
    : freq?.label || 'Mensual';

  return (
    <GlowCard style={[styles.recCard, !item.active && styles.recCardInactive]}>
      <View style={styles.recHeader}>
        <View style={[styles.recIcon, {
          backgroundColor: isIncome ? COLORS.incomeGlow : COLORS.expenseGlow,
          borderColor: isIncome ? COLORS.income : COLORS.expense,
        }]}>
          <CategoryImage image={cat?.image} icon={cat?.icon || (isIncome ? '💰' : '💸')} size={22} />
        </View>
        <View style={styles.recInfo}>
          <Text style={[styles.recName, !item.active && { opacity: 0.5 }]}>{item.name}</Text>
          <Text style={styles.recMeta}>
            {freqLabel}
            {item.dayOfMonth ? ` · Día ${item.dayOfMonth}` : ''}
            {account ? ` · ${account.name}` : ''}
          </Text>
        </View>
        <View style={styles.recRight}>
          <Text style={[styles.recAmount, { color: isIncome ? COLORS.income : COLORS.expense, opacity: item.active ? 1 : 0.4 }]}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <View style={styles.recActions}>
            <Switch
              value={!!item.active}
              onValueChange={() => onToggle(item)}
              trackColor={{ false: COLORS.bgCardLight, true: `${COLORS.primary}88` }}
              thumbColor={item.active ? COLORS.primaryLight : COLORS.textDim}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
            <TouchableOpacity onPress={() => onEdit(item)}>
              <Ionicons name="pencil-outline" size={14} color={COLORS.textDim} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item)}>
              <Ionicons name="trash-outline" size={14} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </GlowCard>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 100 },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 16 },
  systemLabel: { color: COLORS.accentLight, fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 16, opacity: 0.8 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillText: { fontSize: 13, fontWeight: '700' },

  body: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },

  groupLabel: {
    color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginTop: 8, marginBottom: 4,
  },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  addBtnText: { color: COLORS.primaryLight, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  emptyState: {
    alignItems: 'center', padding: 32, borderRadius: 4,
    borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, gap: 8,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  recCard: { marginBottom: 0 },
  recCardInactive: { opacity: 0.65 },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recIcon: { width: 40, height: 40, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  recInfo: { flex: 1 },
  recName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  recMeta: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  recRight: { alignItems: 'flex-end', gap: 4 },
  recAmount: { fontSize: 14, fontWeight: '800' },
  recActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  cargoBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1,
  },
  cargoBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  progressBg: { height: 4, backgroundColor: COLORS.borderSubtle, borderRadius: 2, overflow: 'hidden', marginTop: 10, marginBottom: 8 },
  progressFill: { height: 4, borderRadius: 2 },
  fiFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fiMeta: { color: COLORS.textDim, fontSize: 10, flex: 1 },
  fiActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    borderWidth: 1, borderColor: `${COLORS.accent}66`, backgroundColor: `${COLORS.accent}11`,
  },
  applyBtnText: { color: COLORS.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  // Debt pay modal info
  debtPayInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 8, marginBottom: 20,
    backgroundColor: 'rgba(244,63,94,0.08)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.25)',
  },
  debtPayName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  debtPayMeta: { color: '#fb7185', fontSize: 12, marginTop: 2 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 24, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 2, marginBottom: 20 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgCardLight, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 4, color: COLORS.text, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 16,
  },
  typeToggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 4, borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  typeBtnText: { color: COLORS.textDim, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  chipBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight,
  },
  chipText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight,
  },
  catName: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  confirmBtn: { position: 'relative' },
  confirmBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  emojiBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight,
  },
  emojiBtnSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  stEmptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
