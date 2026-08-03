package usecase

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"strings"

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
	if err := writer.Write([]string{"ID", "Tanggal", "Tipe", "Kategori", "Jumlah", "Deskripsi"}); err != nil {
		return nil, err
	}

	for _, tx := range txs {
		desc := ""
		if tx.Description != nil {
			desc = *tx.Description
		}
		record := []string{
			tx.ID.String(),
			tx.TransactionDate.Format("2006-01-02"),
			tx.Type,
			tx.Category,
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

func generateFinancialPDF(txs []*domain.FinancialTransaction) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(190, 10, "Laporan Keuangan")
	pdf.Ln(12)

	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(30, 8, "Tanggal", "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 8, "Tipe", "1", 0, "C", false, 0, "")
	pdf.CellFormat(40, 8, "Kategori", "1", 0, "C", false, 0, "")
	pdf.CellFormat(35, 8, "Jumlah", "1", 0, "C", false, 0, "")
	pdf.CellFormat(60, 8, "Deskripsi", "1", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	for _, tx := range txs {
		desc := ""
		if tx.Description != nil {
			desc = *tx.Description
		}
		if len(desc) > 30 {
			desc = desc[:27] + "..."
		}
		pdf.CellFormat(30, 7, tx.TransactionDate.Format("2006-01-02"), "1", 0, "L", false, 0, "")
		pdf.CellFormat(25, 7, tx.Type, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 7, tx.Category, "1", 0, "L", false, 0, "")
		pdf.CellFormat(35, 7, fmt.Sprintf("%.2f", tx.Amount), "1", 0, "R", false, 0, "")
		pdf.CellFormat(60, 7, desc, "1", 1, "L", false, 0, "")
	}

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
