'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Settings, Globe, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface ConcoursThreshold {
  id: string
  year: number
  examType: string
  wilaya: string | null
  threshold: number
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function ConcoursThresholdManager() {
  const [thresholds, setThresholds] = useState<ConcoursThreshold[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    examType: 'CONCOURS',
    wilaya: '',
    threshold: '',
    description: ''
  })

  const fetchThresholds = async () => {
    try {
      const response = await fetch(`/api/admin/concours-thresholds?year=${selectedYear}&examType=CONCOURS`)
      if (response.ok) {
        const data = await response.json()
        setThresholds(data.data)
      }
    } catch (error) {
      console.error('Error fetching thresholds:', error)
      toast.error('Failed to fetch thresholds')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchThresholds()
  }, [selectedYear])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/admin/concours-thresholds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          wilaya: formData.wilaya || null
        })
      })

      if (response.ok) {
        toast.success('Threshold saved successfully')
        setShowForm(false)
        setFormData({
          year: new Date().getFullYear().toString(),
          examType: 'CONCOURS',
          wilaya: '',
          threshold: '',
          description: ''
        })
        fetchThresholds()
      } else {
        toast.error('Failed to save threshold')
      }
    } catch (error) {
      console.error('Error saving threshold:', error)
      toast.error('Failed to save threshold')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this threshold?')) return

    try {
      const response = await fetch(`/api/admin/concours-thresholds?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Threshold deleted successfully')
        fetchThresholds()
      } else {
        toast.error('Failed to delete threshold')
      }
    } catch (error) {
      console.error('Error deleting threshold:', error)
      toast.error('Failed to delete threshold')
    }
  }

  const globalThreshold = thresholds.find(t => !t.wilaya)
  const wilayaThresholds = thresholds.filter(t => t.wilaya)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-600" />
          Concours Threshold Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Year Selector */}
        <div className="mb-6">
          <Label htmlFor="year">Year</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2024, 2023, 2022, 2021].map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Global Threshold */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium">Global Threshold</h3>
          </div>
          
          {globalThreshold ? (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-blue-900">{globalThreshold.threshold}</p>
                  {globalThreshold.description && (
                    <p className="text-sm text-blue-600">{globalThreshold.description}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(globalThreshold.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm">No global threshold set</p>
            </div>
          )}
        </div>

        {/* Wilaya Thresholds */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <h3 className="font-medium">Wilaya Thresholds</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Threshold
            </Button>
          </div>

          {wilayaThresholds.length > 0 ? (
            <div className="space-y-2">
              {wilayaThresholds.map((threshold) => (
                <div key={threshold.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-900">{threshold.wilaya}</span>
                        <Badge variant="outline">{threshold.threshold}</Badge>
                      </div>
                      {threshold.description && (
                        <p className="text-sm text-green-600">{threshold.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(threshold.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm">No wilaya thresholds set</p>
            </div>
          )}
        </div>

        {/* Add Threshold Form */}
        {showForm && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-4">Add New Threshold</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="threshold-type">Type</Label>
                  <Select
                    value={formData.wilaya ? 'wilaya' : 'global'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, wilaya: value === 'global' ? '' : '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="wilaya">Wilaya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.wilaya !== '' && (
                  <div>
                    <Label htmlFor="wilaya">Wilaya</Label>
                    <Input
                      id="wilaya"
                      value={formData.wilaya}
                      onChange={(e) => setFormData(prev => ({ ...prev, wilaya: e.target.value }))}
                      placeholder="Enter wilaya name"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="threshold">Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  step="0.01"
                  value={formData.threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, threshold: e.target.value }))}
                  placeholder="Enter threshold value"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Save Threshold</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


