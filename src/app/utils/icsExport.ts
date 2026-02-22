import { Transaction, Category } from '../types';
import { format, parseISO, addDays } from 'date-fns';
import { toast } from 'sonner';

export function downloadICS(
    transactions: Transaction[],
    categories: Category[],
    filenamePrefix: string = 'Budget_Export',
    filteredCategoryIds: string[] = [],
    recurringExceptions: { ruleId: string; date: string; skipped: boolean }[] = []
) {
    if (transactions.length === 0) return;

    // Separate recurring and non-recurring
    const recurringTransactions = transactions.filter(t => t.isRecurring && !t.isVirtual);
    const nonRecurringTransactions = transactions.filter(t => !t.isRecurring);

    // Group non-recurring transactions by date
    const groupedByDate: Record<string, Transaction[]> = {};
    nonRecurringTransactions.forEach((t) => {
        if (!groupedByDate[t.date]) {
            groupedByDate[t.date] = [];
        }
        groupedByDate[t.date].push(t);
    });

    // ICS Standard Header
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CalendarSpent//Budget Tracker//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    // Determine a stable deterministic hash identifying this filter state
    // E.g., if no filters applied, use "all". If filtered, sort and join to create unique state ID.
    const filterHash = filteredCategoryIds.length > 0
        ? [...filteredCategoryIds].sort().join('-')
        : 'all';

    // Sort the dates descending (newest to oldest) for correct iOS native preview rendering order
    const sortedDays = Object.entries(groupedByDate).sort((a, b) => b[0].localeCompare(a[0]));

    const EMOJI_MAP: Record<string, string> = {
        'Coffee': '☕',
        'Food & Dining': '🍔',
        'Shopping': '🛍️',
        'Transport': '🚗',
        'Entertainment': '🍿',
        'Health': '❤️',
        'Bills': '🧾',
        'Subscriptions': '🔄',
        'Rent / Housing': '🏠',
        'Groceries': '🛒',
        'Utilities': '💡',
    };

    const dtStamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

    // 1. Generate events for recurring transactions (RRULE)
    recurringTransactions.forEach(t => {
        const cat = categories.find(c => c.id === t.category);
        const catName = cat?.name || 'Other';
        const emoji = EMOJI_MAP[catName] || '💸';

        const title = `📅 ${emoji} $${t.amount.toFixed(0)} ${t.vendor} (Recurring)`;
        const description = `Recurring ${t.recurrenceType} expense\\nCategory: ${catName}${t.note ? `\\nNote: ${t.note}` : ''}`;

        const cleanDateStart = t.date.replace(/-/g, '');
        const startDate = parseISO(t.date);
        const endDateDate = addDays(startDate, 1);
        const cleanDateEnd = format(endDateDate, 'yyyyMMdd');

        const rrule = `RRULE:FREQ=${t.recurrenceType === 'weekly' ? 'WEEKLY' : 'MONTHLY'}${t.endDate ? `;UNTIL=${t.endDate.replace(/-/g, '')}` : ''}`;

        const eventLines = [
            'BEGIN:VEVENT',
            `UID:calendarspent-recurring-${t.id}@calendarspent`,
            `DTSTAMP:${dtStamp}`,
            `DTSTART;VALUE=DATE:${cleanDateStart}`,
            `DTEND;VALUE=DATE:${cleanDateEnd}`,
            `SUMMARY:${title}`,
            `DESCRIPTION:${description}`,
            rrule
        ];

        // Add EXDATE for skipped occurrences
        const exceptions = recurringExceptions.filter(e => e.ruleId === t.id && e.skipped);
        if (exceptions.length > 0) {
            const exdates = exceptions.map(e => e.date.replace(/-/g, '')).join(',');
            eventLines.push(`EXDATE;VALUE=DATE:${exdates}`);
        }

        eventLines.push('END:VEVENT');
        icsContent.push(...eventLines);
    });

    // Generate an event for each day
    sortedDays.forEach(([dateStr, dayTransactions]) => {
        const totalSpent = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Group day's transactions by category for perfectly exact breakdowns
        const categoryTotals: Record<string, number> = {};

        dayTransactions.forEach(t => {
            if (!categoryTotals[t.category]) {
                categoryTotals[t.category] = 0;
            }
            categoryTotals[t.category] += t.amount;
        });

        // Find dominant category ID to select the representative emoji
        let dominantCatId: string | null = null;
        let maxAmount = -1;

        Object.entries(categoryTotals).forEach(([catId, amount]) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                dominantCatId = catId;
            }
        });

        const EMOJI_MAP: Record<string, string> = {
            'Coffee': '☕',
            'Food & Dining': '🍔',
            'Shopping': '🛍️',
            'Transport': '🚗',
            'Entertainment': '🍿',
            'Health': '❤️',
            'Bills': '🧾',
        };

        const dominantCatName = dominantCatId
            ? categories.find(c => c.id === dominantCatId)?.name || ''
            : '';
        const categoryEmoji = EMOJI_MAP[dominantCatName] || '💸';

        // Title format: 📅 <categoryEmoji> $<total> spent
        const title = `📅 ${categoryEmoji} $${totalSpent.toFixed(0)} spent`;

        // Description format:
        // Top spending:
        // • Category — $X
        let descriptionLines = ['Top spending:'];

        // Sort categories by amount descending
        const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

        sortedCategories.forEach(([catId, amount]) => {
            const catName = categories.find(c => c.id === catId)?.name || 'Other';
            descriptionLines.push(`• ${catName} — $${amount.toFixed(2)}`);
        });

        const description = descriptionLines.join('\\n');

        // Parse DTSTART and explicitly form DTEND for all-day events using VALUE=DATE
        // Note: 'dateStr' is 'yyyy-MM-dd'. VALUE=DATE requires 'yyyyMMdd'
        const cleanDateStart = dateStr.replace(/-/g, '');

        // An all-day ICS event ending is exclusive (i.e. to cover the 21st entirely, it must end on the 22nd)
        const startDateDate = parseISO(dateStr);
        const endDateDate = addDays(startDateDate, 1);
        const cleanDateEnd = format(endDateDate, 'yyyyMMdd');

        icsContent.push(
            'BEGIN:VEVENT',
            `UID:calendarspent-${dateStr}-${filterHash}@calendarspent`,
            `DTSTAMP:${dtStamp}`,
            `DTSTART;VALUE=DATE:${cleanDateStart}`,
            `DTEND;VALUE=DATE:${cleanDateEnd}`,
            `SUMMARY:${title}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT'
        );
    });

    // Footer
    icsContent.push('END:VCALENDAR');

    const fileData = icsContent.join('\r\n'); // ICS strictly requires CRLF

    const loadingId = toast.loading('Preparing calendar...');

    // Wrap Blob generation in slight timeout to allow UI loading tick to present
    setTimeout(() => {
        // Trigger browser download via Blob
        const blob = new Blob([fileData], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        // Attach highly dynamic unique filename timestamp to immediately break Safari download cache rules
        const timestampSuffix = format(new Date(), 'yyyyMMdd_HHmmss');
        const filename = `${filenamePrefix}_${timestampSuffix}.ics`;

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.dismiss(loadingId);
        toast.success('Calendar export ready');
    }, 600);
}
