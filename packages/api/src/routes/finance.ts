import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  db,
  bankAccounts,
  financialTransactions,
  classificationRules,
  budgets,
  smsParserTemplates,
  workspaceMembers,
} from '@pulse/db';
import { eq, and, desc, sql, gte, lte, ilike, or } from 'drizzle-orm';
import {
  NotFoundError,
  ValidationError,
  classifyTransaction,
  calculateScenarioProjections,
  TransactionType,
  ClassificationRule,
} from '@pulse/core';

export const financeRouter: Router = Router();

// Helper to determine active workspaceId from header, query, body, or user membership
async function getWorkspaceId(req: Request, userId: string): Promise<string> {
  const headerWs = req.headers['x-workspace-id'] as string;
  const queryWs = req.query.workspaceId as string;
  const bodyWs = req.body?.workspaceId as string;

  const candidate = headerWs || queryWs || bodyWs;
  if (candidate && typeof candidate === 'string') {
    return candidate;
  }

  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!membership) {
    throw new ValidationError('Workspace not found or user is not a member of any workspace');
  }

  return membership.workspaceId;
}

// ==========================================
// 1. BANK ACCOUNTS
// ==========================================

// GET /api/finance/accounts — List all bank accounts
financeRouter.get('/accounts', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.workspaceId, workspaceId))
      .orderBy(desc(bankAccounts.createdAt));

    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
});

// POST /api/finance/accounts — Add a new bank account
financeRouter.post('/accounts', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { bankName, label, accountType, accountNumber, currency = 'USD', holderName, ingestionSource } = req.body;

    if (!bankName || !label || !accountType) {
      throw new ValidationError('bankName, label, and accountType are required');
    }

    const [account] = await db
      .insert(bankAccounts)
      .values({
        workspaceId,
        bankName,
        label,
        accountType,
        accountNumber: accountNumber || null,
        currency,
        holderName: holderName || null,
        ingestionSource: ingestionSource || 'Manual',
        isActive: true,
      })
      .returning();

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/finance/accounts/:id — Update account
financeRouter.patch('/accounts/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { id } = req.params;
    const { bankName, label, accountType, accountNumber, currency, holderName, ingestionSource, isActive } = req.body;

    const [existing] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Bank account not found');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (bankName !== undefined) updateData.bankName = bankName;
    if (label !== undefined) updateData.label = label;
    if (accountType !== undefined) updateData.accountType = accountType;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (currency !== undefined) updateData.currency = currency;
    if (holderName !== undefined) updateData.holderName = holderName;
    if (ingestionSource !== undefined) updateData.ingestionSource = ingestionSource;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const [updated] = await db
      .update(bankAccounts)
      .set(updateData)
      .where(eq(bankAccounts.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/finance/accounts/:id — Remove account
financeRouter.delete('/accounts/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { id } = req.params;

    const [deleted] = await db
      .delete(bankAccounts)
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.workspaceId, workspaceId)))
      .returning();

    if (!deleted) {
      throw new NotFoundError('Bank account not found');
    }

    res.json({ success: true, message: 'Bank account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. TRANSACTIONS
// ==========================================

// GET /api/finance/transactions — Filterable ledger
financeRouter.get('/transactions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);

    const {
      type,
      category,
      accountId,
      direction,
      fromDate,
      toDate,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(financialTransactions.workspaceId, workspaceId)];

    if (type && typeof type === 'string') {
      conditions.push(eq(financialTransactions.type, type));
    }
    if (category && typeof category === 'string') {
      conditions.push(eq(financialTransactions.category, category));
    }
    if (accountId && typeof accountId === 'string') {
      conditions.push(eq(financialTransactions.accountId, accountId));
    }
    if (direction && typeof direction === 'string') {
      conditions.push(eq(financialTransactions.direction, direction));
    }
    if (fromDate && typeof fromDate === 'string') {
      conditions.push(gte(financialTransactions.transactionDate, new Date(fromDate)));
    }
    if (toDate && typeof toDate === 'string') {
      conditions.push(lte(financialTransactions.transactionDate, new Date(toDate)));
    }
    if (search && typeof search === 'string') {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(financialTransactions.description, searchPattern),
          ilike(financialTransactions.counterparty, searchPattern),
          ilike(financialTransactions.category, searchPattern)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [totalRecord] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(financialTransactions)
      .where(whereClause);

    const transactions = await db
      .select({
        id: financialTransactions.id,
        workspaceId: financialTransactions.workspaceId,
        accountId: financialTransactions.accountId,
        type: financialTransactions.type,
        category: financialTransactions.category,
        direction: financialTransactions.direction,
        amount: financialTransactions.amount,
        currency: financialTransactions.currency,
        description: financialTransactions.description,
        counterparty: financialTransactions.counterparty,
        referenceId: financialTransactions.referenceId,
        source: financialTransactions.source,
        rawData: financialTransactions.rawData,
        classifiedBy: financialTransactions.classifiedBy,
        transactionDate: financialTransactions.transactionDate,
        createdAt: financialTransactions.createdAt,
        bankName: bankAccounts.bankName,
        accountLabel: bankAccounts.label,
      })
      .from(financialTransactions)
      .leftJoin(bankAccounts, eq(financialTransactions.accountId, bankAccounts.id))
      .where(whereClause)
      .orderBy(desc(financialTransactions.transactionDate))
      .limit(limitNum)
      .offset(offset);

    const total = totalRecord?.count || 0;

    res.json({
      success: true,
      data: transactions,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/finance/transactions — Manual entry
financeRouter.post('/transactions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const {
      accountId,
      amount,
      direction = 'debit',
      description = '',
      transactionDate = new Date(),
      type,
      category,
      counterparty,
      referenceId,
      source = 'manual',
      currency = 'USD',
    } = req.body;

    if (amount === undefined || amount === null) {
      throw new ValidationError('Amount is required');
    }

    let finalType = type;
    let finalCategory = category;
    let classifiedBy = 'user';

    // Auto-classify if type is missing or uncategorized
    if (!finalType || finalType === 'UNCATEGORIZED') {
      const rules = await db
        .select()
        .from(classificationRules)
        .where(eq(classificationRules.workspaceId, workspaceId));

      const classification = classifyTransaction({
        description,
        amount: Number(amount),
        direction: direction as 'credit' | 'debit',
        counterparty,
        rules: rules as ClassificationRule[],
      });

      finalType = classification.type;
      finalCategory = finalCategory || classification.category;
      classifiedBy = 'auto';
    }

    const [tx] = await db
      .insert(financialTransactions)
      .values({
        workspaceId,
        accountId: accountId || null,
        type: finalType,
        category: finalCategory || 'General Spend',
        direction,
        amount: String(amount),
        currency,
        description,
        counterparty: counterparty || null,
        referenceId: referenceId || `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        source,
        classifiedBy,
        transactionDate: new Date(transactionDate),
      })
      .returning();

    res.status(201).json({ success: true, data: tx });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/finance/transactions/:id — Re-classify or edit transaction
financeRouter.patch('/transactions/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { id } = req.params;
    const { type, category, description, amount, direction, counterparty, accountId, transactionDate } = req.body;

    const [existing] = await db
      .select()
      .from(financialTransactions)
      .where(and(eq(financialTransactions.id, id), eq(financialTransactions.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Transaction not found');
    }

    const updateData: Record<string, unknown> = {
      classifiedBy: 'user',
    };
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = String(amount);
    if (direction !== undefined) updateData.direction = direction;
    if (counterparty !== undefined) updateData.counterparty = counterparty;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (transactionDate !== undefined) updateData.transactionDate = new Date(transactionDate);

    const [updated] = await db
      .update(financialTransactions)
      .set(updateData)
      .where(eq(financialTransactions.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/finance/transactions/:id — Delete transaction
financeRouter.delete('/transactions/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { id } = req.params;

    const [deleted] = await db
      .delete(financialTransactions)
      .where(and(eq(financialTransactions.id, id), eq(financialTransactions.workspaceId, workspaceId)))
      .returning();

    if (!deleted) {
      throw new NotFoundError('Transaction not found');
    }

    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. INGESTION (SMS & CSV)
// ==========================================

// POST /api/finance/ingest/sms — Ingest raw SMS alert
financeRouter.post('/ingest/sms', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { sender, text, receivedAt = new Date().toISOString(), accountId } = req.body;

    if (!sender || !text) {
      throw new ValidationError('sender and text are required');
    }

    // 1. Extract amount from SMS
    let amount = 0;
    const amountMatch = text.match(/(?:Rs\.?|LKR|USD|\$|EUR|GBP)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i);
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // 2. Extract direction
    const lowerText = text.toLowerCase();
    let direction: 'credit' | 'debit' = 'debit';
    if (
      lowerText.includes('credited') ||
      lowerText.includes('received') ||
      lowerText.includes('deposited') ||
      lowerText.includes('added to')
    ) {
      direction = 'credit';
    } else if (
      lowerText.includes('debited') ||
      lowerText.includes('paid') ||
      lowerText.includes('spent') ||
      lowerText.includes('withdrawn')
    ) {
      direction = 'debit';
    }

    // 3. Extract reference ID
    const refMatch = text.match(/(?:ref(?:erence)?(?:\s*no)?\.?[:\s]*)([A-Za-z0-9]+)/i);
    const referenceId = refMatch ? refMatch[1] : `SMS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 4. Classify transaction
    const rules = await db
      .select()
      .from(classificationRules)
      .where(eq(classificationRules.workspaceId, workspaceId));

    const classification = classifyTransaction({
      description: text,
      amount,
      direction,
      source: 'sms',
      bankName: sender,
      rules: rules as ClassificationRule[],
    });

    // 5. Insert transaction (handling deduplication via unique referenceId)
    const [tx] = await db
      .insert(financialTransactions)
      .values({
        workspaceId,
        accountId: accountId || null,
        type: classification.type,
        category: classification.category,
        direction,
        amount: String(amount || 0),
        currency: 'USD',
        description: text.slice(0, 500),
        counterparty: sender,
        referenceId,
        source: 'sms',
        rawData: { sender, text, receivedAt },
        classifiedBy: 'auto',
        transactionDate: new Date(receivedAt),
      })
      .onConflictDoNothing({ target: [financialTransactions.workspaceId, financialTransactions.referenceId] })
      .returning();

    res.status(201).json({
      success: true,
      data: tx || { message: 'Duplicate transaction ignored', referenceId },
      parsed: {
        amount,
        direction,
        type: classification.type,
        category: classification.category,
        referenceId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/finance/ingest/csv — Ingest CSV file or data
financeRouter.post('/ingest/csv', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { csv, accountId } = req.body;

    if (!csv || typeof csv !== 'string') {
      throw new ValidationError('csv string payload is required');
    }

    const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new ValidationError('CSV must contain at least a header row and one data row');
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dateIdx = header.findIndex(h => h.includes('date'));
    const descIdx = header.findIndex(h => h.includes('desc') || h.includes('memo') || h.includes('title') || h.includes('narrative'));
    const amountIdx = header.findIndex(h => h.includes('amount') || h.includes('amt'));
    const dirIdx = header.findIndex(h => h.includes('dir') || h.includes('type'));

    const rules = await db
      .select()
      .from(classificationRules)
      .where(eq(classificationRules.workspaceId, workspaceId));

    const inserted: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 2) continue;

      const rawAmount = amountIdx >= 0 ? parseFloat(cols[amountIdx].replace(/[^0-9.-]/g, '')) : 0;
      const desc = descIdx >= 0 ? cols[descIdx] : cols.join(' ');
      const dateVal = dateIdx >= 0 && cols[dateIdx] ? new Date(cols[dateIdx]) : new Date();

      let direction: 'credit' | 'debit' = rawAmount < 0 ? 'debit' : 'credit';
      if (dirIdx >= 0 && cols[dirIdx]) {
        const d = cols[dirIdx].toLowerCase();
        if (d.includes('cr') || d.includes('in') || d.includes('deposit')) direction = 'credit';
        else if (d.includes('dr') || d.includes('out') || d.includes('payment')) direction = 'debit';
      }

      const absAmount = Math.abs(rawAmount);
      const classification = classifyTransaction({
        description: desc,
        amount: absAmount,
        direction,
        source: 'csv',
        rules: rules as ClassificationRule[],
      });

      const refId = `CSV-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;

      const [tx] = await db
        .insert(financialTransactions)
        .values({
          workspaceId,
          accountId: accountId || null,
          type: classification.type,
          category: classification.category,
          direction,
          amount: String(absAmount),
          currency: 'USD',
          description: desc,
          referenceId: refId,
          source: 'csv',
          classifiedBy: 'auto',
          transactionDate: isNaN(dateVal.getTime()) ? new Date() : dateVal,
        })
        .onConflictDoNothing()
        .returning();

      if (tx) inserted.push(tx);
    }

    res.status(201).json({
      success: true,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. SUMMARIES & SCENARIOS
// ==========================================

// GET /api/finance/summary — Financial health summary + monthly breakdown
financeRouter.get('/summary', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { fromDate, toDate } = req.query;

    const conditions = [eq(financialTransactions.workspaceId, workspaceId)];
    if (fromDate && typeof fromDate === 'string') {
      conditions.push(gte(financialTransactions.transactionDate, new Date(fromDate)));
    }
    if (toDate && typeof toDate === 'string') {
      conditions.push(lte(financialTransactions.transactionDate, new Date(toDate)));
    }

    const txs = await db
      .select()
      .from(financialTransactions)
      .where(and(...conditions))
      .orderBy(desc(financialTransactions.transactionDate));

    let totalIncome = 0;
    let totalExpense = 0;
    let totalFees = 0;
    const monthlyMap: Record<string, { income: number; expense: number; fees: number; count: number }> = {};

    for (const tx of txs) {
      const amt = parseFloat(tx.amount as unknown as string) || 0;
      const date = new Date(tx.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { income: 0, expense: 0, fees: 0, count: 0 };
      }
      monthlyMap[monthKey].count += 1;

      if (tx.direction === 'credit') {
        if (tx.type !== 'INTERNAL_TRANSFER') {
          totalIncome += amt;
          monthlyMap[monthKey].income += amt;
        }
      } else {
        if (tx.type === 'BANKING_FEE') {
          totalFees += amt;
          monthlyMap[monthKey].fees += amt;
        } else if (tx.type !== 'INTERNAL_TRANSFER' && tx.type !== 'CARD_REPAYMENT') {
          totalExpense += amt;
          monthlyMap[monthKey].expense += amt;
        }
      }
    }

    const netSavings = Math.round((totalIncome - totalExpense - totalFees) * 100) / 100;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0;

    const monthlyBreakdown = Object.entries(monthlyMap)
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        expense: Math.round(data.expense * 100) / 100,
        fees: Math.round(data.fees * 100) / 100,
        netSavings: Math.round((data.income - data.expense - data.fees) * 100) / 100,
        transactionCount: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        netSavings,
        savingsRate,
        transactionCount: txs.length,
        monthlyBreakdown,
        period: { fromDate, toDate },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/finance/report — Full reconciliation report + Base/Happy/Worst scenario projections
financeRouter.get('/report', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { fromDate, toDate } = req.query;

    const conditions = [eq(financialTransactions.workspaceId, workspaceId)];
    if (fromDate && typeof fromDate === 'string') {
      conditions.push(gte(financialTransactions.transactionDate, new Date(fromDate)));
    }
    if (toDate && typeof toDate === 'string') {
      conditions.push(lte(financialTransactions.transactionDate, new Date(toDate)));
    }

    const txs = await db
      .select()
      .from(financialTransactions)
      .where(and(...conditions));

    let totalIncome = 0;
    let totalExpense = 0;
    let bankingFees = 0;
    let internalTransfers = 0;
    let cardRepayments = 0;
    let brokerInward = 0;
    let brokerOutward = 0;

    for (const tx of txs) {
      const amt = parseFloat(tx.amount as unknown as string) || 0;
      if (tx.type === 'BANKING_FEE') bankingFees += amt;
      else if (tx.type === 'INTERNAL_TRANSFER') internalTransfers += amt;
      else if (tx.type === 'CARD_REPAYMENT') cardRepayments += amt;
      else if (tx.type === 'BROKER_INWARD') brokerInward += amt;
      else if (tx.type === 'BROKER_OUTWARD') brokerOutward += amt;
      else if (tx.direction === 'credit') totalIncome += amt;
      else totalExpense += amt;
    }

    const netPersonalSavings = Math.round((totalIncome - totalExpense - bankingFees) * 100) / 100;

    // Monthly baseline for scenarios
    const monthlyIncome = totalIncome || 5000;
    const monthlyExpense = totalExpense || 3000;
    const monthlyFees = bankingFees || 25;

    const scenarios = calculateScenarioProjections({
      monthlyIncome,
      monthlyExpenses: monthlyExpense,
      monthlyFees,
    });

    const markdown = `# Pulse Financial Intelligence Report
**Generated At:** ${new Date().toUTCString()}

### Executive Ledger Summary
- **Total Income:** $${totalIncome.toLocaleString()}
- **Total Expenses:** $${totalExpense.toLocaleString()}
- **Banking Fees:** $${bankingFees.toLocaleString()}
- **Net Personal Savings:** $${netPersonalSavings.toLocaleString()}
- **Internal Transfers:** $${internalTransfers.toLocaleString()}
- **Broker Activity:** Inward $${brokerInward.toLocaleString()} / Outward $${brokerOutward.toLocaleString()}

### 90-Day Forward Scenario Projections
1. **${scenarios[0].label}:** Projected Savings: $${scenarios[0].projectedNetSavings.toLocaleString()}
2. **${scenarios[1].label}:** Projected Savings: $${scenarios[1].projectedNetSavings.toLocaleString()}
3. **${scenarios[2].label}:** Projected Savings: $${scenarios[2].projectedNetSavings.toLocaleString()}
`;

    res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        summary: {
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalExpense: Math.round(totalExpense * 100) / 100,
          bankingFees: Math.round(bankingFees * 100) / 100,
          internalTransfers: Math.round(internalTransfers * 100) / 100,
          cardRepayments: Math.round(cardRepayments * 100) / 100,
          brokerInward: Math.round(brokerInward * 100) / 100,
          brokerOutward: Math.round(brokerOutward * 100) / 100,
          netPersonalSavings,
          transactionCount: txs.length,
        },
        scenarios,
        markdown,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 5. BUDGETS
// ==========================================

// GET /api/finance/budgets — List budgets with spend progress
financeRouter.get('/budgets', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);

    const userBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.workspaceId, workspaceId))
      .orderBy(desc(budgets.createdAt));

    // Calculate current monthly spend per category
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const spends = await db
      .select({
        category: financialTransactions.category,
        total: sql<number>`COALESCE(SUM(${financialTransactions.amount}::numeric), 0)::float`,
      })
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.workspaceId, workspaceId),
          eq(financialTransactions.direction, 'debit'),
          gte(financialTransactions.transactionDate, startOfMonth)
        )
      )
      .groupBy(financialTransactions.category);

    const spendMap = new Map<string, number>();
    for (const s of spends) {
      if (s.category) spendMap.set(s.category.toLowerCase(), s.total);
    }

    const budgetsWithSpend = userBudgets.map(b => {
      const currentSpend = spendMap.get(b.category.toLowerCase()) || 0;
      const budgetAmount = parseFloat(b.amount as unknown as string) || 0;
      return {
        ...b,
        currentSpend: Math.round(currentSpend * 100) / 100,
        remaining: Math.round((budgetAmount - currentSpend) * 100) / 100,
      };
    });

    res.json({ success: true, data: budgetsWithSpend });
  } catch (error) {
    next(error);
  }
});

// POST /api/finance/budgets — Add budget
financeRouter.post('/budgets', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { category, amount, currency = 'USD', period = 'monthly', startDate } = req.body;

    if (!category || amount === undefined) {
      throw new ValidationError('category and amount are required');
    }

    const [budget] = await db
      .insert(budgets)
      .values({
        workspaceId,
        category,
        amount: String(amount),
        currency,
        period,
        startDate: startDate || null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [budgets.workspaceId, budgets.category, budgets.period],
        set: {
          amount: String(amount),
          currency,
          isActive: true,
        },
      })
      .returning();

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/finance/budgets/:id — Update budget
financeRouter.patch('/budgets/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { id } = req.params;
    const { category, amount, currency, period, isActive } = req.body;

    const updateData: Record<string, unknown> = {};
    if (category !== undefined) updateData.category = category;
    if (amount !== undefined) updateData.amount = String(amount);
    if (currency !== undefined) updateData.currency = currency;
    if (period !== undefined) updateData.period = period;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const [updated] = await db
      .update(budgets)
      .set(updateData)
      .where(and(eq(budgets.id, id), eq(budgets.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new NotFoundError('Budget not found');
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/finance/budgets/:id — Delete budget
financeRouter.delete('/budgets/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { id } = req.params;

    const [deleted] = await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.workspaceId, workspaceId)))
      .returning();

    if (!deleted) {
      throw new NotFoundError('Budget not found');
    }

    res.json({ success: true, message: 'Budget deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 6. CLASSIFICATION RULES & TESTING
// ==========================================

// POST /api/finance/classify — Test classify a single item
financeRouter.post('/classify', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { description, amount = 0, direction = 'debit', counterparty, source, bankName } = req.body;

    if (!description && !counterparty) {
      throw new ValidationError('description or counterparty is required to classify');
    }

    const rules = await db
      .select()
      .from(classificationRules)
      .where(eq(classificationRules.workspaceId, workspaceId));

    const result = classifyTransaction({
      description: description || '',
      amount: Number(amount),
      direction: direction as 'credit' | 'debit',
      counterparty,
      source,
      bankName,
      rules: rules as ClassificationRule[],
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/finance/rules — List workspace rules
financeRouter.get('/rules', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);

    const rules = await db
      .select()
      .from(classificationRules)
      .where(eq(classificationRules.workspaceId, workspaceId))
      .orderBy(desc(classificationRules.priority));

    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

// POST /api/finance/rules — Add a classification rule
financeRouter.post('/rules', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await getWorkspaceId(req, userId);
    const { name, priority = 0, conditions, resultType, resultCategory } = req.body;

    if (!name || !conditions || !resultType) {
      throw new ValidationError('name, conditions, and resultType are required');
    }

    const [rule] = await db
      .insert(classificationRules)
      .values({
        workspaceId,
        name,
        priority: Number(priority) || 0,
        conditions,
        resultType,
        resultCategory: resultCategory || null,
        isActive: true,
      })
      .returning();

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
});
