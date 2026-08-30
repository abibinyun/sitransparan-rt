package usecase

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"strings"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
)

type dashboardUsecase struct {
	repo domain.DashboardRepository
}

func NewDashboardUsecase(repo domain.DashboardRepository) domain.DashboardUsecase {
	return &dashboardUsecase{repo: repo}
}

func (u *dashboardUsecase) GetSummary(ctx context.Context, tenantID uuid.UUID) (*domain.DashboardSummary, error) {
	return u.repo.GetSummary(ctx, tenantID)
}

func (u *dashboardUsecase) ExportFinancialReport(ctx context.Context, tenantID uuid.UUID, filter domain.FinancialReportFilter) ([]byte, string, string, error) {
	txs, err := u.repo.GetFinancialTransactionsForReport(ctx, tenantID, filter.StartDate, filter.EndDate)
	if err != nil {
		return nil, "", "", err
	}

	format := strings.ToLower(filter.Format)
	if format == "pdf" {
		data, err := generateFinancialPDF(txs)
		if err != nil {
			return nil, "", "", err
		}
		return data, "application/pdf", "laporan_keuangan.pdf", nil
	}

	// Default CSV format
	data, err := generateFinancialCSV(txs)
	if err != nil {
		return nil, "", "", err
	}
	return data, "text/csv", "laporan_keuangan.csv", nil
}

func generateFinancialCSV(txs []*domain.FinancialTransaction) ([]byte, error) {
	buf := new(bytes.Buffer)
	writer := csv.NewWriter(buf)

	// Write CSV Header
	if err := writer.Write([]string{"ID", "Tanggal", "Tipe", "Kategori", "Kantong Kas", "Jumlah", "Deskripsi"}); err != nil {
		return nil, err
	}

	for _, tx := range txs {
		desc := ""
		if tx.Description != nil {
			desc = *tx.Description
		}
		fundName := "-"
		if tx.FundName != nil && *tx.FundName != "" {
			fundName = *tx.FundName
		}
		record := []string{
			tx.ID.String(),
			tx.TransactionDate.Format("2006-01-02"),
			tx.Type,
			tx.Category,
			fundName,
			fmt.Sprintf("%.2f", tx.Amount),
			desc,
		}
		if err := writer.Write(record); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func formatRupiahAmount(n float64) string {
	valStr := fmt.Sprintf("%.0f", n)
	if n < 0 {
		valStr = fmt.Sprintf("%.0f", -n)
	}
	var res []byte
	l := len(valStr)
	for i := 0; i < l; i++ {
		if i > 0 && (l-i)%3 == 0 {
			res = append(res, '.')
		}
		res = append(res, valStr[i])
	}
	if n < 0 {
		return "-Rp " + string(res)
	}
	return "Rp " + string(res)
}

func generateFinancialPDF(txs []*domain.FinancialTransaction) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(12, 14, 12)
	pdf.SetAutoPageBreak(true, 14)
	pdf.AddPage()

	// Header / Kop Laporan
	pdf.SetFont("Arial", "B", 16)
	pdf.SetTextColor(15, 23, 42) // slate-900
	pdf.CellFormat(186, 7, "LAPORAN KAS & KEUANGAN RT", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(100, 116, 139) // slate-500
	generatedAt := time.Now().Format("02 January 2006 15:04 WIB")
	pdf.CellFormat(186, 5, fmt.Sprintf("Dicetak pada: %s | Dokumen Transparansi Tata Kelola Warga", generatedAt), "", 1, "L", false, 0, "")
	pdf.Ln(3)

	// Garis pembatas
	pdf.SetDrawColor(226, 232, 240) // slate-200
	pdf.SetLineWidth(0.4)
	pdf.Line(12, pdf.GetY(), 198, pdf.GetY())
	pdf.Ln(4)

	// Summary KPI Box
	var totalIncome, totalExpense float64
	for _, tx := range txs {
		if tx.Type == "income" {
			totalIncome += tx.Amount
		} else if tx.Type == "expense" {
			totalExpense += tx.Amount
		}
	}
	balance := totalIncome - totalExpense

	// 3 Summary Cards
	cardW := 60.0
	cardH := 16.0
	curY := pdf.GetY()

	// Pemasukan Card
	pdf.SetFillColor(240, 253, 244) // emerald-50
	pdf.SetDrawColor(187, 247, 208) // emerald-200
	pdf.RoundedRect(12, curY, cardW, cardH, 2, "1234", "FD")
	pdf.SetXY(14, curY+2)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(21, 128, 61) // emerald-700
	pdf.Cell(cardW-4, 4, "TOTAL PEMASUKAN")
	pdf.SetXY(14, curY+7)
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(4, 120, 87) // emerald-800
	pdf.Cell(cardW-4, 6, formatRupiahAmount(totalIncome))

	// Pengeluaran Card
	pdf.SetFillColor(255, 241, 242) // rose-50
	pdf.SetDrawColor(254, 205, 211) // rose-200
	pdf.RoundedRect(75, curY, cardW, cardH, 2, "1234", "FD")
	pdf.SetXY(77, curY+2)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(190, 18, 60) // rose-700
	pdf.Cell(cardW-4, 4, "TOTAL PENGELUARAN")
	pdf.SetXY(77, curY+7)
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(159, 18, 57) // rose-800
	pdf.Cell(cardW-4, 6, formatRupiahAmount(totalExpense))

	// Saldo Card
	pdf.SetFillColor(240, 249, 255) // sky-50
	pdf.SetDrawColor(186, 230, 253) // sky-200
	pdf.RoundedRect(138, curY, cardW, cardH, 2, "1234", "FD")
	pdf.SetXY(140, curY+2)
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(3, 105, 161) // sky-700
	pdf.Cell(cardW-4, 4, "SALDO AKUMULATIF")
	pdf.SetXY(140, curY+7)
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(12, 74, 110) // sky-900
	pdf.Cell(cardW-4, 6, formatRupiahAmount(balance))

	pdf.SetY(curY + cardH + 6)

	// Header Tabel Transaksi
	pdf.SetFont("Arial", "B", 8)
	pdf.SetFillColor(241, 245, 249) // slate-100
	pdf.SetTextColor(51, 65, 85)    // slate-700
	pdf.SetDrawColor(203, 213, 225) // slate-300

	colTanggal := 22.0
	colTipe := 20.0
	colKategori := 32.0
	colKantong := 32.0
	colJumlah := 30.0
	colDeskripsi := 50.0

	pdf.CellFormat(colTanggal, 7, "Tanggal", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colTipe, 7, "Tipe", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colKategori, 7, "Kategori", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colKantong, 7, "Kantong Kas", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colJumlah, 7, "Jumlah", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colDeskripsi, 7, "Keterangan", "1", 1, "C", true, 0, "")

	// Baris Tabel Transaksi
	pdf.SetFont("Arial", "", 8)
	for i, tx := range txs {
		// Zebra striping
		if i%2 == 0 {
			pdf.SetFillColor(255, 255, 255)
		} else {
			pdf.SetFillColor(248, 250, 252) // slate-50
		}

		desc := "-"
		if tx.Description != nil && *tx.Description != "" {
			desc = *tx.Description
		}
		if len(desc) > 28 {
			desc = desc[:25] + "..."
		}

		fund := "-"
		if tx.FundName != nil && *tx.FundName != "" {
			fund = *tx.FundName
		}
		if len(fund) > 18 {
			fund = fund[:15] + "..."
		}

		cat := tx.Category
		if len(cat) > 18 {
			cat = cat[:15] + "..."
		}

		pdf.SetTextColor(51, 65, 85)
		pdf.CellFormat(colTanggal, 6, tx.TransactionDate.Format("2006-01-02"), "1", 0, "C", true, 0, "")

		// Warna teks tipe
		if tx.Type == "income" {
			pdf.SetTextColor(16, 185, 129) // emerald-500
			pdf.CellFormat(colTipe, 6, "Masuk", "1", 0, "C", true, 0, "")
		} else {
			pdf.SetTextColor(244, 63, 94) // rose-500
			pdf.CellFormat(colTipe, 6, "Keluar", "1", 0, "C", true, 0, "")
		}

		pdf.SetTextColor(51, 65, 85)
		pdf.CellFormat(colKategori, 6, cat, "1", 0, "L", true, 0, "")
		pdf.CellFormat(colKantong, 6, fund, "1", 0, "L", true, 0, "")
		pdf.CellFormat(colJumlah, 6, formatRupiahAmount(tx.Amount), "1", 0, "R", true, 0, "")
		pdf.CellFormat(colDeskripsi, 6, desc, "1", 1, "L", true, 0, "")
	}

	if len(txs) == 0 {
		pdf.SetTextColor(148, 163, 184)
		pdf.CellFormat(186, 8, "Tidak ada transaksi dalam periode ini", "1", 1, "C", false, 0, "")
	}

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
