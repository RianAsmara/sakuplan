// Command seed populates the configured database with a demo user and
// sample data for manual/mobile testing. See internal/seed for details.
package main

import "github.com/sakuplan/api/internal/bootstrap"

func main() {
	bootstrap.NewSeed().Run()
}
