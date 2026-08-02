package application

import (
	"math"

	"github.com/sakuplan/api/internal/domain"
)

func addNonNegativeMoney(values ...domain.Money) (domain.Money, bool) {
	var total domain.Money
	for _, value := range values {
		if value < 0 || total > domain.Money(math.MaxInt64)-value {
			return 0, false
		}
		total += value
	}
	return total, true
}

// proportionalMoney computes amount*numerator/denominator without multiplying
// amount by numerator first, avoiding signed integer overflow. Callers must
// provide non-negative values and 0 <= numerator <= denominator.
func proportionalMoney(amount domain.Money, numerator, denominator int64) domain.Money {
	if amount <= 0 || numerator <= 0 || denominator <= 0 {
		return 0
	}
	quotient := amount / domain.Money(denominator)
	remainder := amount % domain.Money(denominator)
	return quotient*domain.Money(numerator) + (remainder*domain.Money(numerator))/domain.Money(denominator)
}
